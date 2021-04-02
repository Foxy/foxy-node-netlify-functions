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

class OrderDeskClient {

  /**
   *
   * @class
   * @param {string} id OrderDesk id
   * @param {string} apiKey from OrderDesk
   */
  constructor(id, apiKey) {
    this.domain = "app.orderdesk.me";
    this.api = "api/v2/";
    this.id = id;
    this.key = apiKey;
    this.defaultHeader = {
      "Content-Type": "application/json",
      "ORDERDESK-API-KEY": this.key,
      "ORDERDESK-STORE-ID": this.id,
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
   * @param {Array<string>} items codes to be fetched
   * @returns {Array<OrderDeskItem>} items retrieved from OrderDesk
   */
  async fetchInventoryItems(items) {
    const response = await fetch(this.buildEndpoint('inventory-items') + '?' + new URLSearchParams({
      code: items.join(',')
    }), {
      headers: this.defaultHeader,
      method: 'GET'
    })
    return response.json();
  }

  /**
   * Converts an order desk intem into a CartValidados Canonical Item.
   *
   * @param {OrderDeskItem} orderDeskItem to be converted to CanonicalItem
   * @returns {import('../CartValidator.js').CanonicalItem} the resulting Canonical Item.
   */
  convertToCanonical(orderDeskItem) {
    return {
      name: orderDeskItem.name,
      price: orderDeskItem.price,
      inventory: orderDeskItem.stock,
      code: orderDeskItem.code
    }
  }

}

module.exports = OrderDeskClient;
