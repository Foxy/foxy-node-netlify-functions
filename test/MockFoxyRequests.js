const crypto = require('crypto');
const defaultConfig = require('../config.js');

let customConfig;

function getConfig() {
  return customConfig || defaultConfig;
}

function setConfig(cfg) {
  customConfig = cfg;
}

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
  const foxySignature = crypto.createHmac('sha256', getConfig().foxy.webhook.encryptionKey).update(payload).digest('hex');
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
  setConfig,
  validRequest
}