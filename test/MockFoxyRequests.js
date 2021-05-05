const { config } = require("../config.js");
const crypto = require("crypto");

/**
 * Creates a valid request with a given payload.
 *
 * @param {Object|null} payload to be used in the request body.
 * @returns {{headers: {"foxy-webhook-event": string, "content-type": string, "foxy-webhook-signature": string}, body: Object, httpMethod: string}} the valid Foxy Request.
 */
function validRequest(payload = null) {
  if (payload === null) {
    payload = {"foo": "bar"};
  }
  payload = JSON.stringify(payload);
  const foxySignature = crypto.createHmac('sha256', config.foxy.webhook.encryptionKey).update(payload).digest('hex');
  return {
    body: payload,
    headers: {
      'content-type': 'application/json',
      'foxy-webhook-event': 'validation/payment',
      'foxy-webhook-signature': foxySignature,
    },
    httpMethod: 'POST'
  };
}

module.exports = {
  validRequest
}
