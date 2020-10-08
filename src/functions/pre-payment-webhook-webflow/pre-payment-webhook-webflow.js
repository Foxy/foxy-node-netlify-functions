const Webflow = require('webflow-api');

const Config = {
  webflow: {
    limit: 100,
  },
  code_field: 'code',
  price_field: 'price',
  inventory_field: 'inventory',
};

/**
 * Retrieve a custom value from an item
 */
function getItemOption(item, option) {
  let found = item[option];
  if (found) return { name: option, value: item[option] };
  if (item._embedded) {
    if (item._embedded['fx:item_options']) {
      found = item._embedded['fx:item_options'].find((e) => e.name === option);
      if (found && found.value) return found;
    }
  }
  return {};
}

/**
 * Retrieve a custom set field or a default field for a given option
 */
function getCustomItemOption(item, option) {
  const field = getItemOption(item, `${option}_field`);
  let result;
  if (field.value) {
    result = getItemOption(item, field.value);
  } else {
    result = getItemOption(item, option);
  }
  if (!result) result = {};
  return result;
}

const Cache = {
  cache: {},
  addItems(collection, items) {
    if (!Cache.cache[collection]) {
      Cache.cache[collection] = [];
    }
    Cache.cache[collection] = Cache.cache[collection].concat(items);
  },
  findItem(collection, item) {
    if (!Cache.cache[collection]) {
      return null;
    }
    return Cache.cache[collection].find(
      (e) => {
        try {
          return getCustomItemOption(e, 'code').value.toString() === item.code.toString();
        } catch (err) {
          err.message = 'Wrong code_field.';
          err.code = 400;
          throw err;
        }
      },
    );
  },
};

/**
 * Checks if the token is valid
 */
function validToken() {
  return !!process.env.WEBFLOW_TOKEN;
}

/**
 * Extract items from payload received from FoxyCart
 */
function extractItems(body) {
  if (body && body._embedded && body._embedded['fx:items']) {
    return body._embedded['fx:items'];
  }
  return [];
}

/**
 * Checks if item is valid
 */
function validItem(item) {
  return item.price
    && item.quantity
    && item.code
    && getItemOption(item, 'collection_id').value;
}

/**
 * Checks if the price of the item is the same as found in WebFlow Collection
 */
function correctPrice(enrichedItem) {
  if (!enrichedItem.matchedItem) {
    return true;
  }
  const i = enrichedItem;
  return parseFloat(i.matchedItem.price) === parseFloat(getItemOption(i, 'price').value);
}

/**
 * Checks if there is sufficient inventory for this purchase.
 */
function sufficientInventory(enrichedItem) {
  if (!enrichedItem.matchedItem) {
    return true;
  }
  const i = enrichedItem;
  return !Config.inventory_field || i[Config.inventory_field] >= i.matchedItem.quantity;
}

/**
 * Retrieve the Webflow Token
 */
function getToken() {
  return process.env.WEBFLOW_TOKEN;
}

/**
 * Retrieve an instance of the Webflow API Client
 */
function getWebflow() {
  return new Webflow({ token: getToken() });
}

function enrichFetchedItem(match, item) {
  const enriched = match;
  enriched.matchedItem = item;
  return enriched;
}

/**
 * Returns a recursive promise that fetches items from the collection until it
 * finds the item. Resolves the found item or an error.
 *
 * Note: this method will take time linear on the size of the collection.
 * For large collections it will probably timeout.
 *
 * Webflow does not provide a documented feature for retrieving filtered
 * results based on arbitrary field.
 *
 * @param object item: an item received it the request from foxycart
 * @offset number offet: the number of items already checked in this collection
 */
function fetchItem(item, offset = 0) {
  if (offset > 1000) {
    return Promise.reject(new Error('Infinete Loop'));
  }
  const collectionId = getCustomItemOption(item, 'collection_id').value;
  const webflow = getWebflow();
  const found = Cache.findItem(collectionId, item);
  if (found) {
    return Promise.resolve(enrichFetchedItem(found, item));
  }
  return new Promise((resolve, reject) => {
    webflow.items(
      { collectionId },
      { sort: [getCustomItemOption(item, 'code').name, 'ASC'], limit: Config.webflow.limit, offset },
    ).then((collection) => {
      Cache.addItems(collectionId, collection.items);
      const match = collection.items.find(
        (e) => {
          try {
            return e[getCustomItemOption(item, 'code_field').name].toString() === item.code.toString();
          } catch (err) {
            err.code = 400;
            err.message = 'wrong code_field';
            throw err;
          }
        },
      );
      if (match) {
        resolve(enrichFetchedItem(match, item));
      } else if (collection.total > collection.offset + collection.count) {
        fetchItem(item, ((offset / Config.webflow.limit) + 1) * Config.webflow.limit)
          .then((i) => resolve(i))
          .catch((e) => reject(e));
      } else {
        reject(new Error('Item not found'));
      }
    }).catch((e) => {
      reject(e);
    });
  });
}

async function handleRequest(event, context, callback) {
  // Check if the function is ready to operate
  if (!validToken()) {
    callback(null, {
      statusCode: 503,
      body: {
        ok: false,
        details: 'Webflow token not configured.',
      },
    });
    return;
  }
  // Parse the input data
  if (!event || !event.body) {
    callback(null, {
      statusCode: 400,
      details: 'Empty request.',
    });
    return;
  }
  const items = extractItems(event.body);
  // Check if the input is valid
  const invalidItems = items.filter((e) => !validItem(e));
  if (invalidItems.length) {
    callback(null, {
      statusCode: 200,
      body: {
        ok: false,
        details: `Invalid items: ${invalidItems.map((e) => e.name).join(',')}`,
      },
    });
    return;
  }

  const values = [];
  // Fetch information needed to validate the cart
  const concatenatedPromisses = items.reduce(
    (p, i) => p.then(
      (accum) => fetchItem(i).then((fetched) => {
        values.push(fetched);
        return accum;
      }),
    ), Promise.resolve(values),
  );

  await concatenatedPromisses.then(() => {
    if (!values.every(correctPrice)) {
      callback(null, {
        statusCode: 200,
        body: {
          ok: false,
          details: 'Prices do not match.',
        },
      });
      return;
    }
    if (!values.every(sufficientInventory)) {
      callback(null, {
        statusCode: 200,
        body: {
          ok: false,
          details: 'Insufficient inventory.',
        },
      });
      return;
    }
    callback(null, {
      statusCode: 200,
      body: {
        ok: true,
        details: '',
      },
    });
  }).catch((e) => {
    if (e.code && e.code.toString === '429') {
      callback(null, { statusCode: 429, body: 'Rate limit reached' });
    } else if (e) {
      callback(null,
        {
          statusCode: e.code ? e.code : 500,
          body: {
            ok: false,
            details: e.message,
          },
        });
    }
  });
}

exports.handler = handleRequest;
