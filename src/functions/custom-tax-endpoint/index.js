const { json } = require("body-parser");
const FoxyWebhook = require("../../foxy/FoxyWebhook.js");

/**
 * Receives the request, processes it and sends the response.
 * 
 * @param {Object} requestEvent the request event built by Netlify Functions
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */
async function handler(requestEvent) {

// Example: Modify logic to suit your use case
// Assumes that items in the cart will not be mixed with dealer category and other categories
// US — all customers 0% tax
// outside US — 12% tax non-dealers, 5% dealers

const taxPayload = JSON.parse(requestEvent.body);
const country = taxPayload._embedded['fx:shipments'][0]['country'];
const category = taxPayload._embedded['fx:items'][0]['_embedded']['fx:item_category']['code'];
const totalToTax = taxPayload.total_item_price + taxPayload.total_shipping + taxPayload.total_discount;

let tax_rate = 0;

if (country != "US") {
  if (category.toLowerCase() == "dealer") {
    tax_rate = .05;
  } else {
    tax_rate = .12;
  }
}

let tax_amount = tax_rate * totalToTax;
const taxConfiguration = {
   "ok":true,
   "details":"",
   "name":"custom tax",
   "expand_taxes":[
     // you can add up to 3 tax rates here. Be sure to add them together to get the total rate
     {
       "name": "Tax",
       "rate": tax_rate,
       "amount": tax_amount
      }
    ],
    "total_amount": tax_amount,
    "total_rate": tax_rate
  };

 return {
   body: JSON.stringify(taxConfiguration),
   statusCode: 200
  };
}

module.exports = {
  handler
}
