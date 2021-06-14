const { DataStoreBase } = require("../../foxy/DataStoreBase.js");
const fetch = require("node-fetch");

/**
 * @typedef {Object} OrderDeskItem
 * 
 * @property {string} id Order Desk's Internal ID # for the order item read-only
 * @property {string} name Item name
 * @property {number} price Item price, defaults to 0.00
 * @property {number} quantity Item quantity, integer format, defaults to 1
 * @property {number} weight Item weight, decimal format
 * @property {string} code Item SKU or product code
 * @property {('ship'|'noship'|'download'|'future')} delivery_type Defaults to ship
 * @property {string} category_code Further details about the type of item, freeform text
 * @property {Array} variation_list Array with a list of variations in key => value format. Ex: ['Size': 'Large', 'Color': 'Red']
 * @property {Array} metadata Array with a list of extra (hidden) order details in key => value format
 * @property {string} date_added date the item was added to the collection
 * @property {string} date_updated date the item was updated in the collection 
 */



class DataStore extends DataStoreBase {

  token = false;
  credentials;

  constructor() {
    super();
    this.domain = "api.shiptheory.com";
    this.api = "v1";
    this.setCredentials();
  }

  /**
   * Authenticate against Shiptheory and store token.
   *
   * @returns {boolean} is authenticated.
   */
  async authenticate() {
    if (!this.token) {
      const response = await fetch(this.buildEndpoint('token'), {
        body: JSON.stringify({
          email: this.credentials.email,
          password: this.credentials.password
        }),
        headers: this.getDefaultHeader(),
        method: 'POST'
      });
      const parsed = await response.json();
      this.token = parsed.success && parsed.data.token;
    } 
    return !!this.token;
  }

  /**
   * @inheritdoc
   */
  setCredentials() {
    this.credentials = {
      email: process.env["FOXY_SHIPTHEORY_EMAIL"],
      password: process.env["FOXY_SHIPTHEORY_PASSWORD"] 
    }
  }

  /**:
   * Creates the header needed to issue requests to Shiptheory.
   *
   * @returns {Object} default header
   */
  getDefaultHeader() {
    const defaultHeader = {
      'Accept': 'application/json',
      "Content-Type": "application/json"
    }
    if (this.token) {
      defaultHeader.Authorization = `Bearer ${this.token}`
    }
    return defaultHeader;
  }

  /**
   * Builds the full URL of an endpoint from an endpoint path.
   *
   * @param {string} path of the endpoint
   * @returns {string} the full URL of the endpoint.
   */
  buildEndpoint(path) {
    return `https://${this.domain}/${this.api}/${path}`;
  }


  async shipment(transaction) {
    if (!this.token) {
      throw new Error('Must be authenticated to send a shipment');
    }
    const response = await fetch(this.buildEndpoint('shipments'), {
      body: JSON.stringify(this.txToShipment(transaction)),
      headers: this.getDefaultHeader(),
      method: 'POST'
    });
    return response.json();
  } 

  uniqueReference(transactionId, shipmentNumber) {
    return `${transactionId}S${shipmentNumber}`;
  }

  /**
   * Creates a Shiptheory Shipment object given a Foxy Transaction.
   *
   * @param {Object} transaction as received from Foxy
   * @returns {Object} Shipthiory shipment object 
   */
  txToShipment(transaction) {
    const shipments = transaction._embedded['fx:shipments'];
    const items = transaction._embedded['fx:items'];
    if (shipments.length == 0) {
      return {};
    } 
    // TODO: account for possible multiple shippings in a single transaction
    // grab data from each shipment and create a list of shipments to be sent to Shiptheory
    // for now it is simply assuming all items in embedded are part of the shipment
    const products = items.map((p,i) => ({
      height: p.height,
      name: p.name,
      qty: p.quantity,
      sku: p.code || `${transaction.id}-${i}`,
      value: p.price,
      weight: p.weight,
      width: p.width
    }));
    const weight = items.reduce( (accum, curr) => curr.weight + accum);
    return {
      products: products,
      recipient: {
        address_line_1: shipments[0].address1,
        address_line_2: shipments[0].address2,
        city: shipments[0].city,
        country: shipments[0].country,
        email: transaction.customer_email,
        firstname: shipments[0].first_name,
        lastname: shipments[0].last_name,
        postcode: shipments[0].postal_code,
        telephone: shipments[0].phone || '',
      },
      reference: this.uniqueReference(transaction.id, 0),
      reference2: transaction.id,
      shipment_detail: {
        parcels: 1,
        value: transaction.total_item_price,
        weight: weight,
      },
    }
  }

}

module.exports = {
  DataStore
}
