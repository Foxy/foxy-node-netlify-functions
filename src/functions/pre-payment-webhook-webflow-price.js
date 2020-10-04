const Webflow = require('webflow-api');
const fetch = require('node-fetch');


function validPrice(price, item, priceField = undefined) {
  if (!priceField) {
    priceField = 'price'
  }
  return parseFloat(price) === parseFloat(item[priceField]);
}

function validQuantity(quantity, item, quantityField = undefined) {
  return !quantityField || item[quantityField] >= quantity;
}


exports.handler = function(event, context, callback) {
  const currency = event.queryStringParameters.currency;
  const price = event.queryStringParameters.price;
  const collectionId = event.queryStringParameters.collectionId;
  const itemId = event.queryStringParameters.itemId;
  const priceField = event.queryStringParameters.priceField;
  const quantity = event.queryStringParameters.quantity;
  const quantityField = event.queryStringParameters.quantityField;
  let skuField = '';
  if ( !(currency && price && collectionId && itemId) ) {
    return callback("Invalid input", {statusCode: 400, body: "Bad request", "Content-Type": "application/json"});
  } else {
    const webflow = getWebflow();
    webflow.item({collectionId, itemId}).then(item => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          validPrice: validPrice(price, item, priceField),
          validQty: validQuantity(quantity, item, quantityField),
          item: item
        })
      })
    });
  }
}

function getWebflow() {
  return new Webflow({token: getToken()});
}

function getToken() {
    return process.env.WEBFLOW_TOKEN;
}
