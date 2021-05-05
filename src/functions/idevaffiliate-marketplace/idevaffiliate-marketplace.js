const FoxyWebhook = require("../../foxy/FoxyWebhook.js");
const dotenv = require("dotenv");
const { URLSearchParams } = require("url");
const { config } = require("../../../config.js");
const fetch = require("node-fetch");

dotenv.config();

function getIdevApiUrl() {
  return config.idevAffiliate.apiUrl || "";
}
const idevSecretKey = config.idevAffiliate.secretKey || "";
const foxyWebhookEncryptionKey = config.foxy.webhook.encryptionKey || "";

const getAffiliateIdFromProduct = (productCode) => {
  const m = productCode.match(/-a(\d+)$/i)
  return m ? m[1] : null;
};

// TODO: Use this method instead of just referencing the `price`,
// as `price` doesn't include discounts, modifiers, coupons, etc.
const getProductNetPrice = (productCode, webhook) => {};

/**
 * Push a single item to Idev affiliate
 *
 * @param {Object} item to be pushed
 * @param {string|number} webhookId the id of the webhook.
 * @returns {Promise} that resolves to the response of the posting to Idev.
 */
function pushToIdev (item, webhookId) {
  if (!item.name || !item.code || !item.price) {
    return Promise.resolve(false);
  }
  const params = new URLSearchParams();
  params.append("affiliate_id", getAffiliateIdFromProduct(item.code));
  params.append("idev_saleamt", item.price);
  params.append("idev_ordernum", webhookId);
  // TODO: Check an existing attribute to see if this has already been done.
  // Upsert a Foxy API attribute on the product after pushing so it's not duplicated
  // with a re-run of the webhook.
  return fetch(getIdevApiUrl(), {
    body: params,
    method: "POST",
  });
}

/**
 * Processes all transactions within a message.
 *
 * @param {Object} message to be processed
 * @returns {Promise} that resolves to the completion of the processes of all
 * transactions.
 */
async function processTransaction (message) {
  return Promise.all(message._embedded["fx:items"]
      .map(i => pushToIdev(i, message.id))
  );
}

/**
 * Verifies the request as a valid Foxy webhook.
 * @param (string) - The message payload, described here: https://wiki.foxycart.com/v/2.0/webhooks#example_payload
 */
async function handler (requestEvent) {
  const err = FoxyWebhook.validFoxyRequest(requestEvent);
  if (err) {
    return FoxyWebhook.response(err, 400);
  }
  const payload = JSON.parse(requestEvent.body);
  // Make sure everything looks ok
  if (requestEvent.headers["foxy-webhook-event"] !== "transaction/created") {
    return FoxyWebhook.response('Unsupported event.', 501);
  }
  if (
    !payload._embedded ||
    !payload._embedded["fx:items"] ||
    !payload._embedded["fx:items"].length > 0
  ) {
    return FoxyWebhook.response("Invalid payload.", 400);
  }
  try {
    await processTransaction(payload);
    return {
      body: JSON.stringify({ message: "success." }),
      statusCode: 200,
    };
  } catch (e) {
    console.error("ERROR:", err);
    return {
      body: JSON.stringify({ message: "error. check logs." }),
      statusCode: 400,
    };
  }
}

module.exports = {
  handler
}
