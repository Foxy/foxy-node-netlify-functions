const FoxyWebhook = require("../../foxy/FoxyWebhook.js");
const webhook = require("./webhook.js");

/**
 * Receives the request, process it and invokes the callback.
 *
 * @param {Object} requestEvent the event built by Netlify upon receiving the request.
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */
async function handler(requestEvent) {
  // Validation
  if (!validation.configuration.validate()) {
    return validation.configuration.response();
  }
  const inputError = validation.input.getError(requestEvent); 
  if (inputError) {
    return validation.input.response(inputError);
  }
  const response = webhook.transactionCreated(JSON.parse(requestEvent.body));
  return webhook.response();
}

// The validation object is used to aggregate validation functions and responses.
const validation = {
  configuration: {
    response: () => webhook.response(
      "Service Unavailable. Check the webhook error logs.",
      503),
    validate: () => {
      if (!process.env["FOXY_SHIPTHEORY_EMAIL"]) {
        console.error("FOXY_SHIPTHEORY_EMAIL is not configured");
      }
      if (!process.env["FOXY_SHIPTHEORY_PASSWORD"]) {
        console.error("FOXY_SHIPTHEORY_PASSWORD is not configured");
      }
      if (!process.env["FOXY_WEBHOOK_ENCRYPTION_KEY"]) {
        console.error("FOXY_WEBHOOK_ENCRYPTION_KEY is not configured");
      }
      return process.env["FOXY_SHIPTHEORY_EMAIL"] && process.env["FOXY_SHIPTHEORY_PASSWORD"] && process.env["FOXY_WEBHOOK_ENCRYPTION_KEY"];
    }
  },
  input: {
    getError: FoxyWebhook.validFoxyRequest,
    response: (message) => webhook.response(message, 400),
  }
};

module.exports = {
  handler
}
