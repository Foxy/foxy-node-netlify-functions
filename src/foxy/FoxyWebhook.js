const FoxySdk = require("@foxy.io/sdk");
const {config} = require("../../config.js");


/**
 * @typedef {Object} PrepaymentPayload
 * @property {Object} _links 
 * @property {PrepaymentEmbedded} _embedded 
 * @property {string} customer_uri
 * @property {string} template_set_uri
 * @property {string} language
 * @property {string} locale_code
 * @property {string} customer_ip
 * @property {string} ip_country
 * @property {string} session_name
 * @property {string} session_id
 * @property {string} total_item_price
 * @property {string} total_tax
 * @property {string} total_shipping
 * @property {string} total_future_shipping
 * @property {string} total_order
 * @property {string} date_created
 * @property {string} date_modified
 */

/**
 * @typedef {Object} PrepaymentEmbedded
 * @property {Array<PrepaymentItem>} fx:items
 * @property {Array} fx:discounts
 * @property {Array} fx:custom_fields
 * @property {Array} fx:shipment
 * @property {Array} fx:customer
 */

/**
 * @typedef {Object} PrepaymentItem
 * @property {string} item_category_uri
 * @property {string} name
 * @property {string} price
 * @property {string} quantity
 * @property {string} quantity_min
 * @property {string} quantity_max
 * @property {string} weight
 * @property {string} code
 * @property {string} parent_code
 * @property {string} discount_name
 * @property {string} discount_type
 * @property {string} discount_details
 * @property {string} subscription_frequency
 * @property {string} subscription_start_date
 * @property {string} subscription_next_transaction_date
 * @property {string} subscription_end_date
 * @property {string} is_future_line_item
 * @property {string} shipto
 * @property {string} url
 * @property {string} image
 * @property {string} length
 * @property {string} width
 * @property {string} height
 * @property {string} expires
 * @property {string} date_created
 * @property {string} date_modified
 */

/**
 * Retrieves the items from the payload
 *
 * @param {PrepaymentPayload} payload to provide the items.
 * @returns {Array<PrepaymentItem>} an array of items from this payload
 */
function getItems(payload) {
  try {
    return payload._embedded['fx:items'] || [];
  } catch (e) {
    return [];
  }
}

/**
 * Builds a response as expected by the prepayment webhook.
 *
 * @param {string} details about the error, if it happened.
 * @param {number} code the HTTP status code
 * @returns {{body: string, statusCode: number}} a string to be used as the body of the response.
 */
function response(details="", code=200) {
  if (code !== 200 && (!details || details.match(/^\s*$/))) {
    throw new Error("An error response needs to specify details.");
  }
  return {
    body: JSON.stringify({
      details: details || "",
      ok: details === ""
    }),
    statusCode: code
  }
}

/**
 * Creates a details message about insufficient inventory.
 *
 * @param {Array} pairs with insufficient inventory.
 * @returns {string} a configurable message.
 */
function messageInsufficientInventory(pairs) {
  if (!pairs.length) return '';
  const message = config.datastore.error.insufficientInventory ||
    'Insufficient inventory for these items';
  return message + ' ' + pairs
    .map(p => `${p[1].name}: only ${p[1].inventory} available`).join(';')
}

/**
 * Creates a details message about invalid price.
 *
 * @param {Array} pairs with invalid price.
 * @returns {string} a configurable message.
 */
function messagePriceMismatch(pairs) {
  if (!pairs.length) return '';
  const message = config.datastore.error.priceMismatch ||
    'Prices do not match:';
  return message + ' ' + pairs
    .map(p => p[0].name)
    .join(', ');
}

/**
 * Verifies a Foxy Signature in a Webhook.
 *
 * @param {string} payload received in the Foxy Webhook request.
 * @param {string} signature received in the Foxy Webhook request.
 * @param {string} key to be used to verify the signature.
 * @returns {boolean} the signature is valid
 */
function validSignature(payload, signature, key) {
  try {
    return FoxySdk.Backend.verifyWebhookSignature({ key, payload, signature });
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Verifies the signature of a Foxy Webhook Request.
 *
 * @param {Object} req the request with the signature to be verified
 * @returns {boolean} the signature is valid
 */
function verifyWebhookSignature(req) {
  if (!config.foxy.webhook.encryptionKey) {
    console.log("Foxy Webhook Encryption key is not set. Security can be enhanced if you set it.");
    return true;
  }
  const foxyEvent = req.headers['foxy-webhook-event'];
  const signature = req.headers['foxy-webhook-signature'];
  if (foxyEvent === 'validation/payment') {
    if (!signature) {
      return true;
    }
  }
  const key = config.foxy.webhook.encryptionKey;
  const payload = req.body;
  return validSignature(payload, signature, key);
}

/**
 * Validates a Foxy request.
 *
 * It must be a Signed POST request with content-type application/json.
 *
 * @param {Request} requestEvent to be evaluated as valid.
 * @returns {string|boolean} the error with this request.
 */
function validFoxyRequest(requestEvent) {
  let err = false;
  if (!requestEvent) {
    err = 'Request Event does not Exist';
  } else if (!requestEvent.body) {
    err = 'Empty request.';
  } else if (!requestEvent.httpMethod || requestEvent.httpMethod !== 'POST') {
    err = 'Method not allowed';
  } else if (requestEvent.headers['content-type'] !== 'application/json') {
    err = 'Content type should be application/json';
  } else if (!verifyWebhookSignature(requestEvent)) {
    err = 'Forbidden';
  }
  try {
    JSON.parse(requestEvent.body);
  } catch (e) {
    err = 'Payload is not valid JSON.';
  }
  return err;
}

module.exports = {
  getItems,
  messageInsufficientInventory,
  messagePriceMismatch,
  response,
  validFoxyRequest,
  validSignature,
  verifyWebhookSignature,
}

