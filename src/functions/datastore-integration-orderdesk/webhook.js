const FoxyWebhook = require("../../foxy/FoxyWebhook.js");
const { CartValidator } = require("../../foxy/CartValidator.js");
const { DataStore } = require("./DataStore.js");
const { config } = require("../../../config.js");

/**
 * Implements a pre-payment webhook for use with Foxy.io and OrderDesk
 *
 * https://wiki.foxycart.com/v/2.0/pre_payment_webhook
 *
 * @param {Object} body parsed of the request received from Foxy
 * @returns {Response} to the pre payment request.
 */
async function prePayment(body) {
  const datastore = getDataStore();
  const cartValidator = new CartValidator();
  cartValidator.skipFromEnv();
  const pairs = await buildPairs(body, FoxyWebhook, datastore);
  // Check Prices
  const invalidPrice = pairs.filter(p => !cartValidator.validPrice(...p));
  const priceDetail = FoxyWebhook.messagePriceMismatch(invalidPrice);
  const invalidInventory = pairs.filter(p => !cartValidator.validInventory(...p));
  const inventoryDetail = FoxyWebhook.messageInsufficientInventory(invalidInventory);
  if (invalidInventory.length || invalidPrice.length) {
    return response([inventoryDetail, priceDetail].filter(m => m.length > 0).join('\n'));
  } else {
    return response();
  }
}

/**
 * Process a transaction/created Foxy Webhook.
 *
 * @param {Object} body the parsed body of the Foxy request.
 * @returns {Response}
 */
async function transactionCreated(body) {
  if (config.datastore.skipUpdate.inventory === '__ALL__' ) {
    return response();
  }
  try {
    const datastore = getDataStore();
    const pairs = await buildPairs(body, FoxyWebhook, datastore);
    const updated = pairs.map(p => ({...p[1],
      stock: Number(p[1].inventory) - Number(p[0].quantity), // Notice that OrderDesk inventory field is "stock"
    }));
    const result = await datastore.updateInventoryItems(updated);
    if (result.status === 'success') {
      return response();
    } else {
      return response('Internal Server Error', 500);
    }
  } catch (e) {
    console.error('Could not update inventory', e.name, e.message);
    return response('Internal Server Error', 500);
  }
}

/**
 * Prepares lists of items and creates pairs of related items.
 *
 * It builds the list of cart items, getting them from
 *
 * @param {Object} body of the Foxy Webhook Request Event.
 * @param {Object} foxyWebhook that can retrieve the cart items.
 * @param {Object} datastore that can fetch the OrderDesk items.
 * @returns {Array<Array<Object,Object>>} Array of paired cart and canonical items.
 */
async function buildPairs(body, foxyWebhook, datastore) {
  const cartItems = foxyWebhook.getItems(body);
  if (!cartItems || !cartItems.length) {
    return [];
  }
  let canonicalItems = await datastore.fetchInventoryItems(cartItems.map(i => i.code));
  canonicalItems = canonicalItems.map(datastore.convertToCanonical.bind(datastore));
  return codePairs(cartItems, canonicalItems);
}

/**
 * Creates pairs of items based on their code field.
 *
 * @param {Array<Object>} listA of objects with a code field.
 * @param {Array<Object>} listB of objects with a code field.
 * @returns {Array<Array<Object,Object>>} Array of paired cart and canonical items.
 */
function codePairs(listA, listB) {
  return listA.map(a => [a, listB.find(b => b.code === a.code)])
}


/**
 * Creates an instance of the Datastore with the credentials.
 *
 * @returns {Object} the OrderDesk datastore.
 */
function getDataStore() {
  const odConfig = config.datastore.provider.orderDesk;
  return new DataStore(
    odConfig.apiKey,
    odConfig.storeId
  );
}

const response = FoxyWebhook.response;

module.exports = {
  prePayment,
  response,
  transactionCreated,
}
