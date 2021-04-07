const FoxySdk = require('@foxy.io/sdk');

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
 * @property {Array} fx:shipmet
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
    return payload._embedded['fx:items'];
  } catch (e) {
    if (e.name == 'TypeError') {
      return [];
    } else {
      throw e;
    }
  }
}

/**
 * Builds a response as expected by the prepayment webhook.
 *
 * @param {boolean} ok whether the request was successful
 * @param {string} details about the error, if it happened.
 * @returns {string} a string to be used as the body of the response.
 */
function response(details, code=200) {
  if (code !== 200 && (!details || details.match(/^\s*$/))) {
    throw new Error("An error response need to specify details.");
  }
  return {
    body: JSON.stringify({
      details: details || "",
      ok: (code >= 200 && code <300),
    }),
    statusCode: code
  }
}

/**
 * Verifies a Foxy Signature in a Webhook.
 *
 * @param {string} payload received in the Foxy Webhook request.
 * @param {string} signature received in the Foxy Webhook request.
 * @param {string} key to be used to verify the signature.
 * @returns {boolean} the signature is valid
 */
function verifyWebhookSignature(payload, signature, key) {
  try {
    return FoxySdk.Backend.verifyWebhookSignature({ key, payload, signature });
  } catch (e) {
    console.error(e);
    return false;
  }
}

module.exports = {
  getItems,
  response,
  verifyWebhookSignature
}

