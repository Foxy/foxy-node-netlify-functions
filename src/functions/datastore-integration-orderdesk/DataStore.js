const {DataStoreBase} = require("../../foxy/DataStoreBase.js");
const {config} = require("../../../config.js");
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
 *
 */

class DataStore extends DataStoreBase {

  constructor() {
    super();
    this.domain = "app.orderdesk.me";
    this.api = "api/v2/";
    this.setCredentials();
    this.setDefaultConfig();
  }

  /**
   * @inheritdoc
   */
  setCredentials(credentials) {
    credentials = this.parseConfigCredentials(config);
    if (!credentials.key || !credentials.id) {
      throw new Error("Environment variables for OrderDesk store id and/or API key are missing.");
    }
    this.credentials = credentials;
  }

  /**
   * If no value is set for the skip update inventory option, skip all inventories.
   */
  setDefaultConfig() {
    if (!config.datastore.skipUpdate.inventory) {
      this.skipUpdate.inventory.all = true;
    }
  }

  /**:
   * Creates the header needed to issue requests to OrderDesk.
   *
   * @returns {Object} default header
   */
  getDefaultHeader() {
    return {
      "Content-Type": "application/json",
      "ORDERDESK-API-KEY": this.credentials.key,
      "ORDERDESK-STORE-ID": this.credentials.id,
    }
  }

  parseConfigCredentials(config) {
    return {
      id: config.datastore.provider.orderDesk.storeId,
      key: config.datastore.provider.orderDesk.apiKey
    }
  }

  /**
   * Builds the full URL of an endpoint from an endpoint path.
   *
   * @param {string} path of the endpoint
   * @returns {string} the full URL of the endpoint.
   */
  buildEndpoint(path) {
    return `https://${this.domain}/${this.api}${path}`;
  }

  /**
   * Fetch inventory items from OrderDesk.
   *
   * @param {Array<string>} items codes to be fetched
   * @returns {Array<OrderDeskItem>} items retrieved from OrderDesk
   */
  async fetchInventoryItems(items) {
    const u = this.buildEndpoint('inventory-items');
    const response = await fetch(this.buildEndpoint('inventory-items') + '?' + new URLSearchParams({
      code: items.join(',')
    }), {
      headers: this.getDefaultHeader(),
      method: 'GET'
    });
    const parsed = await response.json();
    return parsed.inventory_items;
  }

  /**
   * Update inventory items in OrderDesk
   *
   * It won't update any items if the skip update inventory option is set to __ALL__.
   * It won't update any items whose codes are set in skip update inventory option.
   *
   * @param {Array<OrderDeskItem>} items to be updated.
   * @returns {Object} the OrderDesk response.
   */
  async updateInventoryItems(items) {
    if (this.skipUpdate.inventory.all) {
      return {};
    }
    items = items.filter(i => !this.skipUpdate.inventory.includes(i.code));
    const invalid = items.filter((i) => !this.validateInventoryItem(i));
    if (invalid.length) {
      throw new Error("Invalid inventory items for update " + invalid.join(','));
    }
    const opts = {
      body: JSON.stringify(items),
      headers: this.getDefaultHeader(),
      method: 'PUT'
    };
    const response = await fetch(this.buildEndpoint('batch-inventory-items'), opts );
    return response.json();
  }

  /**
   * Converts an order desk item into a CartValidados Canonical Item.
   *
   * Does not change any field that does not need to be changed.
   * For OrderDesk, simply create an inventory field which is equal to stock.
   *
   * @param {OrderDeskItem} orderDeskItem to be converted to CanonicalItem
   * @returns {import('../../foxy/CartValidator.js').CanonicalItem} the resulting Canonical Item.
   */
  convertToCanonical(orderDeskItem) {
    const result = {
      code: undefined, 
      name: undefined,
      price: undefined,
      ...orderDeskItem, // Overwrite fields
      update_source: 'Foxy-OrderDesk-Webhook',
      inventory: orderDeskItem.stock,
    }
    delete result.stock;
    return result;
  }

  validateInventoryItem(item) {
    return !!(item.id && item.name && item.code && (item.price || item.price === 0) && (item.stock || item.stock === 0));
  }

}

module.exports = {
  DataStore
}
