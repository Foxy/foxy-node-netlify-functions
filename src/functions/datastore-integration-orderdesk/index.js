const FoxyClient = require('../../foxy/FoxyWebhook.js');
const webhook = require('./webhook.js');
const config = require("../../../config.js");

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
async function handleRequest(requestEvent) {
  // Validation
  if (!validation.configuration.validate()) {
    return validation.configuration.response();
  }
  const inputError = validation.input.getError(requestEvent); 
  if (inputError) {
    return validation.input.response(inputError);
  }
  const foxyEvent = requestEvent.headers['foxy-webhook-event'];
  let response;
  switch (foxyEvent) {
    case 'validation/payment':
      response = webhook.prePayment(requestEvent.body);
      break;
    case 'transaction/created':
      response = webhook.transactionCreated(requestEvent.body);
      break;
    default:
      response = BadRequest;
  }
  return response;
}

/**
 * @param req
 */
function validSignature(req) {
  const key = config.foxy.webhook.encryptionKey;
  const payload = req.body;
  const signature = req.headers['Foxy-Webhook-Signature'];
  return FoxyClient.verifyWebhookSignature(payload, signature, key);
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
    response: () => webhook.response(
      "Service Unavailable. Check the webhook error logs.",
      503
    )
    ,
    validate: () => {
      const credentials = config.datastore.provider.orderDesk;
      if (!credentials.storeId) {
        console.error("FOXY_ORDERDESK_STORE_ID is not configured");
      }
      if (!credentials.apiKey) {
        console.error("FOXY_ORDERDESK_API_KEY is not configured");
      }
      if (!config.foxy.webhook.encryptionKey) {
        console.error("FOXY_WEBHOOK_ENCRYPTION_KEY is not configured");
      }
      return credentials.storeId && credentials.apiKey && config.foxy.webhook.encryptionKey
    },
  },
  input: {
    errorMessage: "Bad Request",
    response: (message) => webhook.response(message, 400),
    getError: (requestEvent) => {
      let err = false;
      if (!requestEvent) {
        err = 'Request Event does not Exist';
      } else if (!requestEvent.httpMethod || requestEvent.httpMethod !== 'POST') {
        err = 'Method Not Allowed';
      } else if (!requestEvent.headers) {
        err = 'Invalid request headers';
      } else if (
        !validSignature(requestEvent)
      ) {
        err = 'Forbidden';
      }
      return err;
    },
  }

};

const BadRequest = webhook.response('Bad Request', 400);

exports.handler = handleRequest;
