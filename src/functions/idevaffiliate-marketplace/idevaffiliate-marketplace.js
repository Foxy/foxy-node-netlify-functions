require("dotenv").config();
const config = require("../../config.js");
const fetch = require("node-fetch");

const { URLSearchParams } = require("url");
const { FoxyApi } = require("@foxy.io/node-api");

const foxy = new FoxyApi();
const store = foxy.follow("fx:store");

const idevApiUrl = config.idevAffiliate.apiUrl || "";
const idevSecretKey = config.idevAffiliate.secretKey || "";
const foxyWebhookEncryptionKey = config.foxy.webhook.encryptionKey || "";

const getAffiliateIdFromProduct = (productCode) => {
  if (productCode.match(/\-a(\d+)$/i)) {
    return productCode.match(/\-a(\d+)$/i)[1];
  }
  return null;
};

// TODO: Use this method instead of just referencing the `price`,
// as `price` doesn't include discounts, modifiers, coupons, etc.
const getProductNetPrice = (productCode, webhook) => {};

const pushToIdev = async (item, webhook) => {
  if (!item.name || !item.code || !item.price) {
    return false;
  }

  const params = new URLSearchParams();
  params.append("affiliate_id", getAffiliateIdFromProduct(item.code));
  params.append("idev_saleamt", item.price);
  params.append("idev_ordernum", webhook.id);

  // TODO: Check an existing attribute to see if this has already been done.
  // Upsert a Foxy API attribute on the product after pushing so it's not duplicated
  // with a re-run of the webhook.
  return fetch(idevApiUrl, {
    method: "POST",
    body: params,
  });
};

const processTransaction = async (message) => {
  const promises = [];
  try {
    for (let i = 0; i < message._embedded["fx:items"].length; i++) {
      const item = message._embedded["fx:items"][i];
      promises.push(pushToIdev(item, message));
    }
  } catch (error) {
    console.log("ERROR in processTransaction:", error);
    console.log(message);
  }
  return Promise.all(promises);
};

/**
 * Verifies the request as a valid Foxy webhook.
 * @param (string) - The message payload, described here: https://wiki.foxycart.com/v/2.0/webhooks#example_payload
 */

exports.handler = async (event, context) => {
  // Verify the Foxy webhook is valid
  const foxyWebhookIsVerified = FoxyApi.webhook.verify({
    signature: event.headers["foxy-webhook-signature"],
    payload: event.body,
    key: config.foxy.webhook.encryptionKey,
  });

  // Parse the body
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
    console.log("ERROR: Payload is not a valid Foxy webhook.");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Cannot parse body." }),
    };
  }

  // Make sure everything looks ok
  if (
    !foxyWebhookIsVerified ||
    event.headers["foxy-webhook-event"] !== "transaction/created" ||
    !payload._embedded ||
    !payload._embedded["fx:items"] ||
    !payload._embedded["fx:items"].length > 0
  ) {
    console.log("ERROR: Payload is not a valid Foxy webhook.");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid signature." }),
    };
  }

  return processTransaction(payload)
    .then((data) => {
      console.log(data);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "success." }),
      };
    })
    .catch((err) => {
      console.log("ERROR:");
      console.log(err);
      console.log(payload);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "error. check logs." }),
      };
    });
};
