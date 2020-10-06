const Webflow = require('webflow-api');

const Config = {
  webflow: {
    limit: 100,
  },
  code_field: 'code',
  price_field: 'price',
  inventory_field: 'inventory',
};

const Cache = {
  cache: {},
  addItems(collection, items) {
    if (!this.cache[collection]) {
      this.cache[collection] = [];
    }
    this.cache[collection].concat(items);
  },
  findItem(collection, item) {
    if (!this.cache[collection]) {
      return null;
    }
    return this.cache[collection].find(
      (e) => e[Config.code_field].toString() === item.code.toString(),
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
  return (item.price || item.quantity) && item.code && item.collection_id;
}

/**
 * Retrieve a custom value from an item
 */
function getItemOption(item, option) {
  if (item['_embedded']) {
    let found = item[option];
    if (found) return found;
    if (!found && item['_embedded']['fx:item_options']) {
      found = item['_embedded']['fx:item_options'].find((e) => e.name === option);
      if (found) found.value;
    }
  }
  return null;
}

/**
 * Retrieve a custom set field or a default field for a given option
 */
function getCustomItemOption(item, option) {
  const field = getItemOption(item, `${option}_field`);
  let result;
  if (field) {
    result = getItemOption(item, field);
  } else {
    result = getItemOption(item, option);
  }
  return result;
}

/**
 * Checks if the price of the item is the same as found in WebFlow Collection
 */
function correctPrice(enrichedItem) {
  const i = enrichedItem;
  return parseFloat(i.matchedItem.price) === parseFloat(getItemOption(i, 'price'));
}

/**
 * Checks if there is sufficient inventory for this purchase.
 */
function sufficientInventory(enrichedItem) {
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
 * IIFE returns a function that retrieve an instance of the Webflow API Client
 */
const getWebflow = (() => {
  let WF;
  return () => {
    if (!WF) {
      WF = new Webflow({ token: getToken() });
    }
    return WF;
  };
})();

function enrichFetchedItem(fetched, item) {
  const enriched = fetched;
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
  const collectionId = getCustomItemOption(item, 'collection_id');
  const webflow = getWebflow();
  const found = Cache.findItem(collectionId, item);
  if (found) {
    return Promise.resolve(enrichFetchedItem(found));
  }
  return new Promise((resolve, reject) => {
    webflow.items(
      { collectionId },
      { sort: [Config.code_field, 'ASC'], limit: Config.webflow.limit, offset },
    ).then((collection) => {
      Cache.addItems(collectionId, collection.items);
      const fetched = collection.items.find(
        (e) => e[Config.code_field].toString() === item.code.toString(),
      );
      if (fetched) {
        resolve(enrichFetchedItem(fetched));
      } else if (collection.total > collection.offset * Config.webflow.limit + collection.count) {
        fetchItem(item, offset * Config.webflow.limit)
          .then((i) => resolve(i))
          .catch((e) => reject(e));
      } else {
        reject(new Error('Item not found'));
      }
    }).catch((e) => reject(e));
  });
}

function handleRequest(event, context, callback) {
  // Check if the function is ready to operate
  if (!validToken()) {
    callback(null, {
      statusCode: 503,
      ok: false,
      details: 'Webflow token not configured.',
    });
    return;
  }
  // Parse the input data
  if (!event || !event.body) {
    callback(null, {
      statusCode: 400,
      details: 'Empty request.'
    });
    return;
  }
  const items = extractItems(event.body);
  // Check if the input is valid
  const invalidItems = items.filter((e) => !validItem(e));
  if (invalidItems.length) {
    callback(null, {
      statusCode: 200,
      ok: false,
      details: `Invalid items: ${invalidItems.map((e) => e.name).join(',')}`,
    });
    return;
  }
  // Fetch information needed to validate the cart
  Promise.all(items.map(fetchItem))
    .then((values) => {
      if (!values.every(correctPrice)) {
        callback(null, {
          statusCode: 200,
          ok: false,
          details: 'Prices do not match.',
        });
        return;
      }
      if (!values.every(sufficientInventory)) {
        callback(null, {
          statusCode: 200,
          ok: false,
          details: 'Insufficient inventory.',
        });
        return;
      }
      callback(null, { ok: true, details: '' });
    })
    .catch((e) => {
      if (e.code.toString === '429') {
        callback(null, { statusCode: 429, body: 'Rate limit reached' });
      } else {
        callback(null, { statusCode: e.code, body: e.message });
      }
    });
}

exports.handler = handleRequest;
