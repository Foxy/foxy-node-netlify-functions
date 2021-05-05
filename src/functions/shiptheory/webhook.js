const FoxyWebhook = require("../../foxy/FoxyWebhook.js");
const { DataStore } = require("./DataStore.js");


/**
 * Process a transaction/created Foxy Webhook.
 *
 * @param {Object} body the parsed body of the Foxy request.
 * @returns {Response} the respose to be sent
 */
async function transactionCreated(body) {
  try {
    const datastore = await getDataStore();
    const result = await datastore.shipment(body);
    if (result.success === 'true' || result.success === true) {
      return response();
    } 
  } catch (e) {
    console.error(e.code, e.message);
  }
  return response('Internal Server Error', 500);
}

/**
 * @returns {Object} the ShipTheory client.
 */
async function getDataStore() {
  const shiptheoryDS = new DataStore();
  const authenticated = await shiptheoryDS.authenticate();
  if (!authenticated) {
    throw new Error("Could not authenticate against Shiptheory.");
  }
  return shiptheoryDS;
}

const response = FoxyWebhook.response;

module.exports = {
  response,
  transactionCreated,
}
