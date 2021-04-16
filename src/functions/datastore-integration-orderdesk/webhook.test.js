const rewire = require("rewire");
const { expect } = require("chai");
const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const webhook = rewire("./webhook.js");

const oldFoxyWebhook = webhook.__get__('FoxyWebhook');
const MockFoxyWebhook = {
  item: {},
  getItems: function() {
    return [
      this.item
    ];
  },
  response: oldFoxyWebhook.response
}

webhook.__set__('FoxyWebhook', MockFoxyWebhook);

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
webhook.__set__('getDataStore', () => MockDatastore);

/**
 * Creates an Arbitrary Cart Item
 */
function arbitraryCartItem() {
  return {
    name: 'foo',
    price: 1,
    quantity: 2,
    quantity_min: 1,
    quantity_max: 3,
    weight: 3,
    code: 1,
    parent_code: 4,
    subscription_frequency: '1m',
    subscription_start_date: new Date().toISOString()
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

function resetMocks() {
  MockFoxyWebhook.item = arbitraryCartItem();
  MockDatastore.item = {...MockFoxyWebhook.item};
  MockDatastore.item.inventory = MockDatastore.item.quantity;
  MockDatastore.differences = [];
}

async function prePaymentExpectOk() {
  const result = await webhook.prePayment('foo');
  expect(result.statusCode).to.equal(200);
  expect(result.body).to.exist;
  const parsed = JSON.parse(result.body);
  expect(parsed.ok).to.be.true;
  expect(parsed.details).to.equal("");
  return parsed;
}

async function prePaymentExpectInvalid(reg) {
  const result = await webhook.prePayment('foo');
  expect(result.statusCode).to.equal(200);
  expect(result.body).to.exist;
  const parsed = JSON.parse(result.body);
  expect(parsed.ok).to.be.false;
  expect(parsed.details).to.match(reg);
  return parsed;
}

describe("Pre-payment Webhook", function() {
  describe("Validates the cart items prices agains a datastore", function() {
    it("Accepts if the prices are the same", async function () {
      resetMocks();
      await prePaymentExpectOk();
    });

    it("Accepts prices zero", async function () {
      resetMocks();
      MockFoxyWebhook.item.price = 0;
      MockDatastore.item.price = 0;
      await prePaymentExpectOk();
    });

    it("Accepts if the datastore has no price", async function () {
      resetMocks();
      MockDatastore.item.price = undefined;
      await prePaymentExpectOk();
    });

    it("Rejects if the prices are different", async function () {
      resetMocks();
      MockDatastore.item.price = 10;
      const result = await webhook.prePayment('foo');
      expect(result.statusCode).to.equal(200);
      expect(result.body).to.exist;
      expect(JSON.parse(result.body).ok).to.be.false;
      expect(JSON.parse(result.body).details).to.match(/Invalid items/);
    });

    it("Rejects if the cart has no price and the datastore does", async function() {
      resetMocks();
      MockFoxyWebhook.item.price = undefined;
      await prePaymentExpectInvalid(/Invalid items/);
    });
  });

  describe("Validates the cart items quantities agains a datastore", function() {
    it("Accepts if the quantity is the same or lower as the inventory", async function () {
      resetMocks();
      await prePaymentExpectOk();
      resetMocks();
      MockDatastore.item.inventory += 1;
      await prePaymentExpectOk();
    });

    it("Accepts if the quantity is zero", async function () {
      resetMocks();
      MockFoxyWebhook.item.quantity = 0;
      await prePaymentExpectOk();
      MockDatastore.item.inventory = -1;
      await prePaymentExpectOk();
    });

    it("Accepts if the the inventory field is null", async function () {
      resetMocks();
      MockDatastore.item.inventory = undefined;
      await prePaymentExpectOk();
    });

    it("Rejects if the quantity is higher", async function () {
      resetMocks();
      MockFoxyWebhook.item.quantity = 10;
      await prePaymentExpectInvalid(/Insuficient inventory/);
    });

  });

  describe("Responds useful messages", function () {
    it("Informs the invalid items when the price is wrong.", async function () {
      resetMocks();
      MockDatastore.item.price = 100;
      const body = await prePaymentExpectInvalid(/Invalid items/);
      expect(body.details).match(/Invalid items: foo/);
    });

    it("Informs the items with insuficient inventory and the current available inventory.", async function () {
      resetMocks();
      MockDatastore.item.inventory = 0;
      const body = await prePaymentExpectInvalid(/Insuficient inventory/);
      expect(body.details).match(/Insuficient inventory for these items: foo/);
    });
  });
});

describe("Transaction Created Webhook", function() {
  describe("Updates the datastore", function() {
    it("Deduces the quantity from the inventory.", async function () {
      resetMocks();
      await webhook.transactionCreated('foo');
      expect(MockDatastore.item.stock).to.equal(0);
      resetMocks();
      MockDatastore.item.inventory = 5;
      MockFoxyWebhook.item.quantity = 3;
      await webhook.transactionCreated('foo');
      expect(MockDatastore.item.stock).to.equal(2);
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
