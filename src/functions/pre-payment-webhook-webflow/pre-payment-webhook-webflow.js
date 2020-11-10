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
 * @param {object} item the item that should have the option
 * @param {String} option to be retrieved
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
 *
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

/**
 * Creates a cache object to store collection items and avoid repeated requests
 * to webflow.
 */
function createCache() {
  return {
    cache: {},
    addItems(collection, items) {
      if (!this.cache[collection]) {
        this.cache[collection] = [];
      }
      this.cache[collection] = this.cache[collection].concat(items);
    },
    findItem(collection, item) {
      if (!this.cache[collection]) {
        return null;
      }
      return this.cache[collection].find(
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
}

/**
 * Extract items from payload received from FoxyCart
 *
 * @param {object.} body of the response received from Webflow
 * @return {array} an array of items
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
 * Validation checks
 */
const validation = {
  configuration: {
    validate: () => !!process.env.WEBFLOW_TOKEN,
    response: () => ({
      statusCode: 503,
      body: JSON.stringify({ ok: false, details: 'Webflow token not configured.' }),
    })
  },
  input: {
    validate: (event) => event && event.body,
    response: () => ({
      statusCode: 400,
      body: JSON.stringify({ ok: false, details: 'Empty request.' }),
    })
  },
  items: {
    validate: (items) => items.every(e => validItem(e)),
    response: (items) => ({
      statusCode: 200,
      body: JSON.stringify({
        ok: false,
        details: `Invalid items: ${items.filter(e => !validItem(e)).map((e) => e.name).join(',')}`,
      }),
    })
  }
}

/**
 * Checks if the price of the item is the same as found in WebFlow Collection
 */
function correctPrice(enrichedItem) {
  if (!enrichedItem.matchedFoxyItem) {
    // an item with no matched item is not to be checked
    return true;
  }
  const i = enrichedItem;
  return parseFloat(i.matchedFoxyItem.price) === parseFloat(getItemOption(i, 'price').value);
}

/**
 * Checks if the category of the item is the same as found in WebFlow Collection
 */
function correctCategory(enrichedItem) {
  if (!enrichedItem.matchedFoxyItem) {
    // an item with no matched item is not to be checked
    return true;
  }
  // if no category is found in the collection item, ignore it
  const category = getCustomItemOption(enrichedItem, 'category');
  const categoryExists = !!Object.keys(category).length;
  if (!categoryExists) return true;
  let matchedCategory;
  const embedded = enrichedItem.matchedFoxyItem._embedded;
  if (embedded && embedded['fx:item_category']) {
    matchedCategory = embedded['fx:item_category'].code;
  }
  return matchedCategory && category.value.trim() === matchedCategory.trim();
}

/**
 * Checks if there is sufficient inventory for this purchase.
 */
function sufficientInventory(enrichedItem) {
  if (!enrichedItem.matchedFoxyItem) {
    return true;
  }
  const i = enrichedItem;
  return !Config.inventory_field || i[Config.inventory_field] >= i.matchedFoxyItem.quantity;
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

/**
 * Stores a reference to the matched item in the item itself.
 * returns an enriched item that can be easily validated.
 */
function enrichFetchedItem(webflowItem, foxyItem) {
  const enriched = webflowItem;
  enriched.matchedFoxyItem = foxyItem;
  return enriched;
}

/**
 * Returns a recursive promise that fetches items from the collection until it
 * finds the item. Resolves the found item.
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
function fetchItem(cache, foxyItem, offset = 0) {
  if (offset > 1000) {
    return Promise.reject(new Error('Infinete Loop'));
  }
  const collectionId = getCustomItemOption(foxyItem, 'collection_id').value;
  const webflow = getWebflow();
  const found = cache.findItem(collectionId, foxyItem);

  if (found) {
    return Promise.resolve(enrichFetchedItem(found, foxyItem));
  }
  return new Promise((resolve, reject) => {
    webflow.items(
      { collectionId },
      { sort: [getCustomItemOption(foxyItem, 'code').name, 'ASC'], limit: Config.webflow.limit, offset },
    ).then((collection) => {
      cache.addItems(collectionId, collection.items);
      const match = collection.items.find(
        (e) => {
          try {
            return e[getCustomItemOption(foxyItem, 'code_field').value].toString() === foxyItem.code.toString();
          } catch (err) {
            err.code = 400;
            err.message = 'Wrong code_field.';
            throw err;
          }
        },
      );
      if (match) {
        resolve(enrichFetchedItem(match, foxyItem));
      } else if (collection.total > collection.offset + collection.count) {
        fetchItem(cache, foxyItem, ((offset / Config.webflow.limit) + 1) * Config.webflow.limit)
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

function shouldEvaluate(enrichedItem) {
  // Ignore past subscriptions
  if (
    enrichedItem.matchedFoxyItem.subscription_frequency
    && enrichedItem.matchedFoxyItem.subscription_start_date
  ) {
    const subscriptionStart = new Date(enrichedItem.matchedFoxyItem.subscription_start_date);
    const stripTime = (v) => v.replace(/T.*$/, '');
    // Convert to UTC, strip time and compare
    if (stripTime(new Date().toISOString()) > stripTime(subscriptionStart.toISOString())) {
      return false;
    }
  }
  // Evaluates by default
  return true;
}

/**
 * Searches for an invalid value applying a list of criteria
 */
function findMismatch(values) {
  const evaluations = [
    [correctPrice, 'Prices do not match.'],
    [correctCategory, 'Mismatched category.'],
    [sufficientInventory, 'Insufficient inventory.'],
  ];
  for (let v = 0; v < values.length; v += 1) {
    if (shouldEvaluate(values[v])) {
      for (let i = 0; i < evaluations.length; i += 1) {
        if (!evaluations[i][0](values[v])) {
          return evaluations[i][1];
        }
      }
    }
  }
  return false;
}

const responses = {
  configurationError: { ok: false, details: 'Webflow token not configured.' }
}

async function handleRequest(event, context, callback) {
  // Validation
  if (!validation.configuration.validate()) {
    callback(null, validation.configuration.response());
    return;
  }
  if (!validation.input.validate(event)) {
    callback(null, validation.input.response());
    return;
  }
  const items = extractItems(event.body);
  if (!validation.items.validate(items)) {
    callback(null, validation.items.response(items));
    return;
  }

  const values = [];
  const cache = createCache();
  // Fetch information needed to validate the cart
  const concatenatedPromisses = items.reduce(
    (p, i) => p.then(
      (accum) => fetchItem(cache, i).then((fetched) => {
        values.push(fetched);
        return accum;
      }),
    ), Promise.resolve(values),
  );

  await concatenatedPromisses.then(() => {
    const failed = findMismatch(values);
    if (failed) {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({ details: failed, ok: false, }),
      });
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({ details: '', ok: true, }),
      });
    }
  }).catch((e) => {
    if (e.code && e.code.toString() === '429') {
      callback(null, {
        statusCode: 429,
        body: JSON.stringify({ details: 'Rate limit reached.', ok: false, }),
      });
    } else {
      callback(null, {
        statusCode: e.code ? e.code : 500,
        body: JSON.stringify({ details: e.message, ok: false, }),
      });
    }
  });
}

exports.handler = handleRequest;
