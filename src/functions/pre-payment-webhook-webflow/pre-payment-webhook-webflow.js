import Webflow from "webflow-api";

const Config = {
  code_field: 'code',
  inventory_field: 'inventory',
  price_field: 'price',
  webflow: {
    limit: 100,
  },
};

/**
 * Get an option of an item.
 *
 * @param {object} item the item that should have the option
 * @param {string} option to be retrieved
 * @returns {{}|{name: string, value: string|number}} name and value of the option
 *  returns an empty object if the option is not available
 */
function getOption(item, option) {
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
 * Returns the custom key for a given option, if it is set, or the default key.
 *
 * @param {object} item where the key it to be searched (this is the item received from foxy)
 * @param {string} default_key to be checked
 * @returns {string} actual key to be used
 */
function getCustomKey(item, default_key) {
  let config_key = default_key;
  if (!default_key.endsWith('_field')) {
    config_key = `${default_key}_field`;
  }
  const custom_key = getOption(item, config_key).value;
  return custom_key ? custom_key : default_key;
}

/**
 * Retrieve an option from an item using it's custom key, if set, of the default key
 *
 * @param item the item to retrieve the custom option from
 * @param option the option to retrieve
 * @returns {{}|{name: string, value: string|number}} the retrieved option
 */
function getCustomizableOption(item, option) {
  const custom_option = getCustomKey(item, option);
  let result = getOption(item, custom_option);
  if (!result) result = {};
  return result;
}

/**
 * Creates a cache object to store collection items and avoid repeated requests
 * to webflow.
 */
function createCache() {
  return {
    addItems(collection, items) {
      if (!this.cache[collection]) {
        this.cache[collection] = [];
      }
      this.cache[collection] = this.cache[collection].concat(items);
    },
    cache: {},
    findItem(collection, item) {
      if (!this.cache[collection]) {
        return null;
      }
      return this.cache[collection].find(
        (e) => {
            return getCustomizableOption(e, getCustomKey(item, 'code')).value.toString() === item.code.toString();
        },
      );
    },
  };
}

/**
 * Extract items from payload received from FoxyCart
 *
 * @param {object.} body of the response received from Webflow
 * @returns {Array} an array of items
 */
function extractItems(body) {
  const objBody = JSON.parse(body);
  if (objBody && objBody._embedded && objBody._embedded['fx:items']) {
    return objBody._embedded['fx:items'];
  }
  return [];
}

/**
 * Checks if item is valid
 *
 * @param item to be validated
 * @returns {boolean} valid
 */
function validItem(item) {
  return item.price
    && item.quantity
    && item.code
    && getOption(item, 'collection_id').value;
}

/**
 * Validation checks
 */
const validation = {
  configuration: {
    response: () => ({
      body: JSON.stringify({ details: 'Webflow token not configured.', ok: false }),
      statusCode: 503,
    }),
    validate: () => !!process.env.WEBFLOW_TOKEN,
  },
  input: {
    response: () => ({
      body: JSON.stringify({ details: 'Empty request.', ok: false }),
      statusCode: 400,
    }),
    validate: (event) => event && event.body,
  },
  items: {
    response: (items) => ({
      body: JSON.stringify({
        details: `Invalid items: ${items.filter(e => !validItem(e)).map((e) => e.name).join(',')}`,
        ok: false,
      }),
      statusCode: 200,
    validate: (items) => items.every(e => validItem(e)),
    })
  }
}

/**
 * Checks if the price of the item is the same as found in WebFlow Collection
 *
 * @param enrichedItem item received from webflow with item received from foxy embedded
 * @returns  {boolean} price is correct
 */
function isPriceCorrect(enrichedItem) {
  if (!enrichedItem.matchedFoxyItem) {
    // an item with no matched item is not to be checked
    return true;
  }
  return parseFloat(enrichedItem.matchedFoxyItem.price) === parseFloat(getOption(enrichedItem, getCustomKey('price')).value);
}

/**
 * Checks if the category of the item is the same as found in WebFlow Collection
 *
 * @param enrichedItem the enriched item
 * @returns {boolean} the categories match
 */
function correctCategory(enrichedItem) {
  if (!enrichedItem.matchedFoxyItem) {
    // an item with no matched item is not to be checked
    return true;
  }
  // if no category is found in the collection item, ignore it
  const category = getCustomizableOption(enrichedItem, 'category');
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
 *
 * @param enrichedItem enriched item to be checked
 * @returns {boolean} the inventory is sufficient
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
 *
 * @returns {string} the WEBFLOW_TOKEN
 */
function getToken() {
  return process.env.WEBFLOW_TOKEN;
}

/**
 * Retrieve an instance of the Webflow API Client
 *
 * @returns {Webflow} the webflow api object
 */
function getWebflow() {
  return new Webflow({ token: getToken() });
}

/**
 * Stores a reference to the matched item in the item itself.
 * returns an enriched item that can be easily validated.
 *
 * @param webflowItem the item received from Webflow
 * @param foxyItem the item received from Foxy
 * @returns {object} an enriched item
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
 * @param {object} cache object
 * @param {object} foxyItem received from foxycart
 * @param {number} offset number of items to skip
 * @returns {Promise<{object}>} a promise for the item from Webflow
 */
function fetchItem(cache, foxyItem, offset = 0) {
  if (offset > 1000) {
    return Promise.reject(new Error('Infinete Loop'));
  }
  const collectionId = getCustomizableOption(foxyItem, 'collection_id').value;
  const webflow = getWebflow();
  const found = cache.findItem(collectionId, foxyItem);
  if (found) {
    return Promise.resolve(enrichFetchedItem(found, foxyItem));
  }
  return new Promise((resolve, reject) => {
    webflow.items(
      { collectionId },
      { sort: [getCustomKey(foxyItem, 'code'), 'ASC'], limit: Config.webflow.limit, offset },
    ).then((collection) => {
      cache.addItems(collectionId, collection.items);
      const match = collection.items.find(
        (e) => {
          return e[getCustomKey(foxyItem, 'code')].toString() === foxyItem.code.toString()
        }
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

/**
 * Checks if a particular enriched item should be evaluated or not
 *
 * @param enrichedItem enriched item to evaluate
 * @returns {boolean} the item should be evaluated
 */
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
 *
 * @param values to find mismatches
 * @returns {boolean|Array} mismatches were found
 */
function findMismatch(values) {
  const evaluations = [
    [isPriceCorrect, 'Prices do not match.'],
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

/**
 * @param event the request
 * @param context context values
 * @param callback function to callback upon response
 */
async function handleRequest(event, context, callback) {
  // Validation
  if (!validation.configuration.validate()) {
    console.log('Configuration error: WEBFLOW_TOKEN not configured')
    callback(null, validation.configuration.response());
    return;
  }
  if (!validation.input.validate(event)) {
    console.log('Input error: empty body');
    callback(null, validation.input.response());
    return;
  }
  const items = extractItems(event.body);
  if (!validation.items.validate(items)) {
    const invalidItems = validation.items.response(items);
    callback(null, invalidItems);
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
      console.log('Mismatch found: payment rejected')
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({ details: failed, ok: false, }),
      });
    } else {
      console.log('OK: payment approved - no mismatch found')
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({ details: '', ok: true, }),
      });
    }
  }).catch((e) => {
    if (e.code && e.code.toString() === '429') {
      console.log('Error: Webflow rate limit reached.')
      callback(null, {
        statusCode: 429,
        body: JSON.stringify({ details: 'Rate limit reached.', ok: false, }),
      });
    } else {
      console.log('Error', e.code, e.message);
      callback(null, {
        statusCode: e.code ? e.code : 500,
        body: JSON.stringify({ details: e.message, ok: false, }),
      });
    }
  });
}

exports.handler = handleRequest;
