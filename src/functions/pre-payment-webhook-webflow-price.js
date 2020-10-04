const Webflow = require('webflow-api');
const fetch = require('node-fetch');


function invalidInput(event) {
  const keys = Object.keys(event.queryStringParameters);
  if (keys.length < 3)
    return "Provide currency, price and product"
  if (keys.length > 3 && !keys.includes('skuField')) {
    return "Specify the skuField"
  }
  return false;
}

function getSKUfield(query) {
  let skuField;
  const keys = Object.keys(query);
  if (keys.length === 3) {
    for (let k of keys) {
      if (k !== 'currency' && k !== 'price') {
        skuField = k;
      }
    }
  } else {
    skuField = query.sku;
  }
  return skuField;
}

function validPrice(price, item, priceField = undefined) {
  if (!priceField) {
    priceField = 'price'
  }
  console.log('Price',  parseFloat(price) === parseFloat(item[priceField]) );
  return parseFloat(price) === parseFloat(item[priceField]);
}

function validQuantity(quantity, item, quantityField = undefined) {
  console.log('Quantity', !quantityField || item[quantityField] >= quantity);
  return !quantityField || item[quantityField] >= quantity;
}


exports.handler = function(event, context, callback) {
  //console.log("params", event, context, callback);
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
    webflow.info().then(info => console.log('Info', info))
    webflow.item({collectionId, itemId}).then(item => {
      console.log(item);
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
