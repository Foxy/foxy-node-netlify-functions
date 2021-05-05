const {config} = require("../../config.js");


/**
 * @typedef {Object} CanonicalItem
 * @property {string} name the name of the product
 * @property {number|undefined} price the product price
 * @property {number|undefined} inventory the amount available in the inventory.
 * @property {string} code the unique code of the product (sku)
 * @property {string|undefined} parent_code the code of the parent product if
 *  it exists.
 */


class CartValidator {

  skipValidation = {
    inventory: [],
    price: [],
  }

  /** 
   * Configure the Cart Validator to skip validating a code.
   *
   * @param {string} code the code to be skipped during inventory validation.
   */
  skipInventory(code) {
    this.skipValidation.inventory.push(code);
  }

  /**
   * Configure the Cart Validator to skip validating a code.
   *
   * @param {string} code the code to be skipped during price validation.
   */
  skipPrice(code) {
    this.skipValidation.price.push(code);
  }

  /**
   * Autoconfigures the instance to skip the validation of prices and inventory
   * of items with codes listed in the configured environment variables.
   */
  skipFromEnv() {
    if (config.datastore.skipValidation.inventory === '__ALL__') {
      this.skipValidation.inventory.all = true;
    }
    if (config.datastore.skipValidation.price === '__ALL__') {
      this.skipValidation.price.all = true;
    }
    (config.datastore.skipValidation.price || '').split(',').forEach(this.skipPrice.bind(this));
    (config.datastore.skipValidation.inventory || '').split(',').forEach(this.skipPrice.bind(this));
  }

  /**
   * Validates a cartItem has the correct inventory according to a canonical
   * item.
   *
   * @param {Object} cartItem to be validated against a canonical item.
   * @param {CanonicalItem} canonicalItem to validate the cartItem.
   * @returns {boolean} price is valid.
   *
   */
  validPrice(cartItem, canonicalItem) {
    return this.skipValidation.inventory.all ||
      this.skipValidation.price.includes(cartItem.code) ||
      !canonicalItem.price ||
      parseFloat(cartItem.price) === parseFloat(canonicalItem.price.toString());
  }

  /**
   * Validates a cartItem has the correct price according to a canonical item.
   *
   * @param {import('./FoxyWebhook.js').PrepaymentItem} cartItem the cart item to be validated.
   * @param {CanonicalItem} canonicalItem the canonical against which the cart
   * item will be validated.
   * @returns {boolean} the inventory is sufficient for this purchase.
   */
  validInventory(cartItem, canonicalItem) {
    return this.skipValidation.inventory.all ||
      this.skipValidation.inventory.includes(cartItem.code) ||
      !cartItem.quantity ||
      canonicalItem.inventory === undefined ||
      Number(cartItem.quantity) <= Number(canonicalItem.inventory);
  }
}

module.exports = {
  CartValidator
}
