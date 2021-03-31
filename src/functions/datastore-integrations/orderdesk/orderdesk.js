const prepaymentWebhook = require('../../foxy/prepaymentWebhook.js');
const OrderDeskClient = require('./orderdeskClient.js');

/**
 * @callback requestCallback
 * @param {}
 */

/**
 * Receives the request, process it and invokes the callback.
 *
 * @param {Object} requestEvent the event built by Netlify upon receiving the request.
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */
function handleRequest(requestEvent) {
  // Validation
  if (!validation.configuration.validate()) {
    return validation.configuration.response();
  }
  if (!validation.input.validate(requestEvent)) {
    return validation.input.response();
  }
  const foxyItems = prepaymentWebhook.getItems(requestEvent.body);
  const odClient = getOrderDeskClient();
  const codes = foxyItems.map(i => i.code);
  const orderDeskItems = odClient.fetchInventoryItems(codes);
}

function getOrderDeskClient() {
  return new OrderDeskClient(
    process.env["ORDERDESK_API_KEY"],
    process.env["ORDERDESK_STORE_ID"]
  );
}

/**
 * @typedef {Object} Validation
 * @property {Function} response a function that builds the response
 * @property {Function} validate a function that is used to validate
 */

// The validation object is used to aggregate validation functions
// and responses.
// @type {Object<string, Validation>}
const validation = {
  configuration: {
    response: () => ({
      body: prepaymentWebhook.buildResponseBody(
        false,
        "Service Unavailable. Check the webhook error logs."
      ),
      statusCode: 503
    }),
    validate: () => {
      if (!process.env.ORDERDESK_STORE_ID) {
        console.error("ORDERDESK_STORE_ID is not configured");
      }
      if (!process.env.ORDERDESK_API_KEY) {
        console.error("ORDERDESK_API_KEY is not configured");
      }
      return process.env.ORDERDESK_STORE_ID &&
        process.env.ORDERDESK_API_KEY 
    },
  }
};

exports.handler = handleRequest;
