const webhook = require("../../../src/functions/datastore-integration-orderdesk/webhook.js");
const { describe, it, before, beforeEach, after, afterEach} = require("mocha");
const chai = require("chai");
const sinon = require("sinon");
const nock = require("nock");
const {config} = require("../../../config.js");

const expect = chai.expect;

function setConfig() {
  config.datastore.provider.orderDesk.storeId = 'foo';
  config.datastore.provider.orderDesk.apiKey = 'bar';
}

const MockDatastore = {
  item: {},
  updateResponse: {
    status: 'success'
  }, 
  differences: [],
  fetchInventoryItems:  async function() {
    return [arbitraryCanonicalItem(
      this.item, this.differences
    )]
  },
  updateInventoryItems: async function(i) {
    this.item = i[0];
    return this.updateResponse;
  },
  convertToCanonical: (i) => i
}

/**
 * Creates an Arbitrary Cart Item
 */
function arbitraryCartItem() {
  return {
    code: 1,
    name: 'foo',
    parent_code: 4,
    price: 1,
    quantity: 2,
    quantity_max: 3,
    quantity_min: 1,
    subscription_frequency: '1m',
    subscription_start_date: new Date().toISOString(),
    weight: 3,
  }
}

/**
 * Creates an Arbitrary Order Desk Item
 * @param {import(../../../foxy/FoxyWebhook).PrepaymentItem} item
 * @param {Array<string>} differences to exist between the pairs
 */
function arbitraryCanonicalItem(item = {}, differences = []) {
  item = {
    name: item.name,
    price: item.price,
    inventory: item.inventory,
    code: item.code,
    parent_code: item.parent_code
  }
  for (let d of differences) {
    item[d] += 1;
  }
  return item;
}

async function prePaymentExpectOk(item) {
  const result = await webhook.prePayment({_embedded: {'fx:items':[item]}});
  expect(result.statusCode).to.equal(200);
  expect(result.body).to.exist;
  const parsed = JSON.parse(result.body);
  expect(parsed.ok).to.be.true;
  expect(parsed.details).to.equal("");
  return parsed;
}

async function prePaymentExpectInvalid(item, reg) {
  const result = await webhook.prePayment({_embedded: {'fx:items':[item]}});
  expect(result.statusCode).to.equal(200);
  expect(result.body).to.exist;
  const parsed = JSON.parse(result.body);
  expect(parsed.ok).to.be.false;
  expect(parsed.details).to.match(reg);
  return parsed;
}

describe("OrderDesk Pre-payment Webhook", function() {
  let log;
  let logError;

  before(
    function() {
      log = sinon.stub(console, 'log');
      logError = sinon.stub(console, 'error');
    }
  );

  beforeEach(
    function() {
      setConfig();
      nock.cleanAll();
    }
  );

  after(
    function() {
      log.restore();
      logError.restore();
    }
  );

  describe("Validates the cart items prices against a datastore", function() {
    it("Accepts if the prices are the same", async function () {
      const item = arbitraryCartItem();
      setOrderDeskItemsResponse([item]);
      await prePaymentExpectOk(item);
    });

    it("Accepts prices zero", async function () {
      const item = arbitraryCartItem();
      item.price = 0;
      setOrderDeskItemsResponse([item]);
      await prePaymentExpectOk(item);
    });

    it("Accepts if the datastore has no price", async function () {
      const cartItem = arbitraryCartItem();
      const datastoreItem = {...cartItem};
      delete datastoreItem.price;
      setOrderDeskItemsResponse([datastoreItem]);
      await prePaymentExpectOk(cartItem);
    });

    it("Rejects if the prices are different", async function () {
      const cartItem = arbitraryCartItem();
      const datastoreItem = {...cartItem, price: cartItem.price + 10};
      setOrderDeskItemsResponse([datastoreItem]);
      await prePaymentExpectInvalid(cartItem, /Prices do not match/);
    });

    it("Rejects if the cart has no price and the datastore does", async function() {
      const cartItem = arbitraryCartItem();
      delete cartItem.price;
      const datastoreItem = arbitraryCartItem();
      setOrderDeskItemsResponse([datastoreItem]);
      await prePaymentExpectInvalid(cartItem, /Prices do not match/);
    });
  });

  describe("Validates the cart items quantities against a datastore", function() {
    it("Accepts if the quantity is the same or lower as the inventory", async function () {
      const item = arbitraryCartItem();
      const datastoreItem = {...item}
      setOrderDeskItemsResponse([datastoreItem])
      await prePaymentExpectOk(item);
      datastoreItem.inventory += 1;
      setOrderDeskItemsResponse([datastoreItem])
      await prePaymentExpectOk(item);
    });

    it("Accepts if the quantity is zero", async function () {
      const item = arbitraryCartItem();
      item.quantity = 0;
      setOrderDeskItemsResponse([item])
      await prePaymentExpectOk(item);
      setOrderDeskItemsResponse([{...item, inventory: -1}])
      await prePaymentExpectOk(item);
    });

    it("Accepts if the the inventory field is null", async function () {
      const item = arbitraryCartItem();
      const datastoreItem = {...item};
      delete datastoreItem.inventory;
      setOrderDeskItemsResponse([datastoreItem]);
      await prePaymentExpectOk(item);
    });

    it("Rejects if the quantity is higher", async function () {
      const item = arbitraryCartItem();
      const datastoreItem = {...item};
      item.quantity = 10;
      datastoreItem.stock = 9;
      setOrderDeskItemsResponse([datastoreItem]);
      await prePaymentExpectInvalid(item, /Insufficient inventory/);
    });

  });
});

describe("Transaction Created Webhook", function() {

  describe("Updates the datastore", function() {
    beforeEach(
      function() {
        setConfig();
        nock.cleanAll();
      }
    );
    it("Deduces the quantity from the inventory.", async function () {
      config.datastore.skipUpdate.inventory = 'false';
      const inventory = 1234;
      const item = arbitraryCartItem();
      item.inventory = inventory;
      item.stock = item.inventory;
      item.id = item.code;
      setOrderDeskItemsResponse([item]);
      nock('https://app.orderdesk.me', {
        reqheaders: {
          'ORDERDESK-API-KEY': 'bar',
          'ORDERDESK-STORE-ID': 'foo',
        }
      })
        .put('/api/v2/batch-inventory-items')
        .query(true)
        .reply(200, (path, body) => {
            expect(body[0].stock).to.equal(inventory - item.quantity);
            return JSON.stringify((body.every(i => i.name && (i.price || i.price ===0) && (i.inventory || i.inventory === 0))) &&
              { status: "success"} ||
              { status: "fail"}
            );
          }
        );
      const response = await webhook.transactionCreated({_embedded: {'fx:items': [{...item, inventory: item.quantity}]}});
      expect(response.statusCode).to.equal(200);
    });

    it("Sets Foxy.io OrderDesk Webhook as the update method");
  });

  describe("Responds useful messages", function() {
    it("Informs Foxy.io that the update was not successful.", async function () {
      const prevResponse = MockDatastore.updateResponse;
      MockDatastore.updateResponse = {
        status: 'fail'
      };
      let result = await webhook.transactionCreated('foo');
    });
  });

});

function setOrderDeskItemsResponse(items) {
  nock('https://app.orderdesk.me:443')
    .get('/api/v2/inventory-items')
    .query(true)
    .reply(200, {
      inventory_items: [...items]
    });
}
