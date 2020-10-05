const Webflow = require('webflow-api');

/**
 * Checks if the token is valid
 */
function validToken() {
  return !!process.env.WEBFLOW_TOKEN;
}

/**
 * Checks if the query string is valid
 */
function validQueryString(qs) {
  return (qs.price || qs.quantity) && qs.code && qs.collectionId;
}

/**
 * Checks if the price of the item is the same as found in WebFlow Collection
 */
function correctPrice(price, item, priceField = undefined) {
  let pf = priceField;
  if (!pf) {
    pf = 'price';
  }
  return parseFloat(price) === parseFloat(item[pf]);
}

/**
 * Checks if there is sufficient inventory for this purchase.
 */
function sufficientInventory(quantity, item, inventoryField = undefined) {
  return !inventoryField || item[inventoryField] >= quantity;
}

/**
 * Retrieve the Webflow Token
 */
function getToken() {
  return process.env.WEBFLOW_TOKEN;
}

/**
 * Create or retrieve an instance of the Webflow API Client
 */
const getWebflow = function getWebflow() {
  let WF;
  return function () {
    if (!WF) {
      WF = new Webflow({ token: getToken() });
    }
    return WF;
  }
}();

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
 * There is an undocumented sorting feature that could allow for a more
 * efficient search: It is possible to use the total to implement something
 * like a binary search by adjusting the offset to the middle point in the
 * pages yet to be searched.
 *
 * This optimization is out of the scope of this example.
 */
function findItem(collectionId, codeField, code, offset = 0) {
  const limit = 100;
  const webflow = getWebflow();
  return new Promise((resolve, reject) => {
    webflow.items(
      { collectionId },
      { sort: [codeField, 'ASC'], limit, offset },
    ).then((collection) => {
      const item = collection.items.find((e) => e[codeField].toString() === code.toString());
      if (item) {
        resolve(item);
      } else if (collection.total > collection.offset * limit + collection.count) {
        findItem(collectionId, codeField, code, offset + limit)
          .then((i) => resolve(i))
          .catch((e) => reject(e));
      } else {
        reject(new Error('Item not found'));
      }
    }).catch((e) => reject(e));
  });
}

function handleRequest(event, context, callback) {
  if (!validToken()) {
    callback(null, {
      statusCode: 503,
      body: 'Webflow token not configured',
    });
    return;
  }
  const qs = event.queryStringParameters;
  if (!validQueryString(qs)) {
    callback(null, {
      statusCode: 400,
      body: 'Bad Request',
    });
    return;
  }
  const codeField = qs.codeField ? qs.codeField : 'code';
  findItem(qs.collectionId, codeField, qs.code)
    .then((item) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          correctPrice: correctPrice(qs.price, item, qs.priceField),
          sufficientInventory: sufficientInventory(qs.quantity, item, qs.inventoryField),
          item,
        }),
      });
    }).catch(
      (e) => {
        if (e.code.toString === '429') {
          callback(null, { statusCode: 429, body: 'Rate limit reached' });
        } else {
          callback(null, { statusCode: 404, body: 'Not found' });
        }
      },
    );
}

exports.handler = handleRequest;
