const rewire = require("rewire");
const sinon = require("sinon");
const { expect } = require("chai");
const { afterEach, beforeEach, describe, it } = require("mocha");
const MockFoxyRequests = require("../../MockFoxyRequests.js");

const prePayment = rewire("../../../src/functions/datastore-integration-webflow/index.js");
const mockFoxyCart = require("./mock/foxyCart");
const mockWebflow = require("./mock/webflow");
const config = prePayment.__get__('config');

config.foxy.webhook.encryptionKey = 'foxy';


let injectedWebflow;

const internalErrorMessage = "An internal error has occurred";

/**
 * Creates a function that, starting with a given number, increases 1 unit for each invocation.
 *
 * @param {number} number initial value
 * @returns {Function} a function that returns a number that is one unit larger than the number returned in previous invocation.
 */
function increaseFrom(number) {
  let count = number;
  return () => {
    const temp = count;
    count += 1;
    return temp;
  };
}

describe("Initialize and validate the webhook", () => {

  it("Gets the webflow api instance with the token from the environment variable", () => {
    config.datastore.provider.webflow.token = "foobar";
    const getToken = prePayment.__get__("getToken");
    expect(getToken()).to.equal("foobar");
    const getWebflow = prePayment.__get__("getWebflow");
    expect(getWebflow().token).to.equal("foobar");
  });

  it("Only executes if there is a FOXY_WEBFLOW_TOKEN set", async () => {
    /**
     * @param {Error} error the errors received.
     * @param {Object} response the response received.
     */
    function noToken(error, response) {
      expect(JSON.parse(response.body).ok).to.equal(false);
      expect(JSON.parse(response.body).details).to.equal(
        "Webflow token not configured."
      );
    }
    /**
     * @param {Error} error the errors received.
     * @param {Object} response the response received.
     */
    function withToken(error, response) {
      expect(response.details).not.to.equal("Webflow token not configured.");
    }
    config.datastore.provider.webflow.token = undefined;
    await prePayment.handler(null, null, noToken);
    config.datastore.provider.webflow.token = "FOOBAR";
    await prePayment.handler({}, null, withToken);
  });

  it("Extracts the items from FoxyCart payload", async () => {
    const extractItems = prePayment.__get__("extractItems");
    let items = extractItems('{}');
    expect(items.length).to.equal(0);
    items = extractItems(JSON.stringify(mockFoxyCart.basic()));
    expect(items.length).to.equal(10);
    items = extractItems(JSON.stringify(mockFoxyCart.longCollection()));
    expect(items.length).to.equal(100);
  });

  it("Identifies the price, quantity and code fields", async () => {
    const extractItems = prePayment.__get__("extractItems");
    const getCustomItemOption = prePayment.__get__("getCustomizableOption");
    const items = extractItems(JSON.stringify(mockFoxyCart.longCollection()));
    items.forEach((i) => {
      expect(Number(getCustomItemOption(i, "price"))).to.be.a("number");
      expect(Number(getCustomItemOption(i, "quantity"))).to.be.a("number");
      expect(Number(getCustomItemOption(i, "inventory"))).to.be.a("number");
    });
    expect(items.length).to.equal(100);
  });
});

describe("Verifies the price of an item in a Webflow collection", () => {
  let log;
  let logError;

  beforeEach(function() {
    log = sinon.stub(console, 'log');
    logError = sinon.stub(console, 'error');
  });

  afterEach( function () {
    log.restore();
    logError.restore();
  });


  beforeEach(() => {
    injectedWebflow = {
      items: () => Promise.reject(new Error("Mocked function")),
    };
    prePayment.__set__("getWebflow", () => injectedWebflow);
    config.datastore.provider.webflow.token = "FOOBAR";
    config.datastore.field.code = 'mysku';
  });

  afterEach(() => {
    config.datastore.error.priceMismatch = '';
    config.datastore.error.insufficientInventory = '';
    config.datastore.field.code = '';
    config.datastore.field.price = '';
    config.datastore.field.inventory = '';
    config.datastore.skipValidation.inventory = '';
    config.datastore.skipValidation.price = '';
  });

  /**
   * Creates a request for a subscrition with a given start date
   *
   * @param startDate the start date of the subscription
   * @returns request event
   */
  function subscriptionsWithStartDate(startDate) {
    const nextMonth = ((d) => new Date(d.setDate(d.getMonth() + 1)))(
      new Date()
    );
    const nextYear = ((d) => new Date(d.setDate(d.getYear() + 1)))(new Date());
    const event = mockFoxyCart.request(
      {
        price: 21,
        quantity: 1,
        sub_frequency: "1m",
        subscription_end_date: nextYear.toISOString(),
        subscription_frequency: "1m",
        subscription_next_transaction_date: nextMonth.toISOString(),
        subscription_start_date: startDate.toISOString()
      },
      mockFoxyCart.itemBuilders.subscriptionItem
    );
    return event;
  }

  describe("Configurable options", () => {

    it("Ignores price verification for codes in FX_SKIP_PRICES_FIELDS ", async () => {
      let response;
      config.datastore.skipValidation.price = 'editable';
      const event = mockFoxyCart.request({ code: 'editable', price: 0.1, quantity: 1 });
      const items =  JSON.parse(event.body)._embedded["fx:items"];
      injectedWebflow.items = () =>
        Promise.resolve(
          mockWebflow.arbitrary(items, {
            mysku: 'editable',
            price: false
          })({}, {})
        );
      response = await prePayment.handler(event, {});
      expect(response.statusCode).to.deep.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        details: "",
        ok: true,
      });
    });

    it("Ignores inventory checks if FOXY_FIELD_INVENTORY is set to null or false", async () => {
      const event = mockFoxyCart.request({ price: 11, quantity: 11 });
      config.datastore.field.inventory = 'Null';
      const response = await insufficientInventoryRequest(event);
      expect(response.statusCode).to.exist.and.to.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({ ok: true, details: "" });
    });

    it("Ignores inventory checks if no such field exist in Webflow", async () => {
      let response;
      const event = mockFoxyCart.request({ price: 11, quantity: 999999999 });
      const items =  JSON.parse(event.body)._embedded["fx:items"];
      injectedWebflow.items = () =>
        Promise.resolve(
          mockWebflow.arbitrary(items, {}, ['inventory'])({}, {})
        );
      response = await prePayment.handler(event, {});
      expect(response.statusCode).to.deep.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        details: "",
        ok: true,
      });
    });

    it("Ignores inventory checks for codes excluded with FOXY_SKIP_INVENTORY_CODES", async () => {
      let response;
      config.datastore.skipValidation.inventory = 'limitless';
      const event = mockFoxyCart.request({ code: 'limitless', price: 11, quantity: 100 });
      const items =  JSON.parse(event.body)._embedded["fx:items"];
      injectedWebflow.items = () =>
        Promise.resolve(
          mockWebflow.arbitrary(items, {
            inventory: () => 1
          })({}, {})
        );
      response = await prePayment.handler(event, {});
      expect(response.statusCode).to.deep.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        details: "",
        ok: true,
      });
    });

    it("Customizes the insufficient inventory response", async () => {
      config.datastore.error.insufficientInventory = 'foobar: ';
      const response = await insufficientInventoryRequest();
      expect(response.statusCode).to.deep.equal(200);
      const body = JSON.parse(response.body);
      expect(body.details).to.match(/^foobar: /);
    });

  });

  it("Evaluates new subscriptions", async () => {
    let response;
    const event = subscriptionsWithStartDate(
      ((d) => new Date(d.setDate(d.getDate() + 1)))(new Date())
    );
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(JSON.parse(event.body)._embedded["fx:items"], {
          price: false,
        })({}, {})
      );
    response = await prePayment.handler(event);
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: "Prices do not match.",
      ok: false,
    });
  });

  it("Ignore existing subscriptions.", async () => {
    let response;
    const event = subscriptionsWithStartDate(
      ((d) => new Date(d.setDate(d.getDate() - 1)))(new Date())
    );
    const items = JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {
          price: false,
        })({}, {})
      );
    response = await prePayment.handler(event, {});
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({ ok: true, details: "" });
  });

  it("Rejects invalid items.", async () => {
    const invalidItemOptions = {
      'code': /has no code\.$/,
      'collection_id': /has no collection_id\.$/,
      'price': /has no price\.$/,
      'quantity': /has no quantity\.$/,
    }
    for (const [key, regex] of Object.entries(invalidItemOptions)) {
      let response;
      const changes = {};
      if (key === 'collection_id') {
        changes['options'] = {collection_id: false};
      } else {
        changes[key] = false;
      }
      const event = mockFoxyCart.request(changes);
      const items =  JSON.parse(event.body)._embedded["fx:items"];
      // Make sure the response values matches
      injectedWebflow.items = function () {
        return Promise.resolve(mockWebflow.arbitrary(items, {}, [key])());
      };
      response = await prePayment.handler(event, {});
      expect(response.statusCode).to.equal(200);
      const body = JSON.parse(response.body);
      expect(body).to.exist;
      expect(body.ok).to.equal(false);
      expect(body.details).to.contain("Invalid items");
    }
  });

  it("Approves when all items are correct", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    // Make sure the response values matches
    injectedWebflow.items = function () {
      return Promise.resolve(
        mockWebflow.arbitrary(items)({}, {}, [
          "category",
        ])
      );
    };
    const context = {};
    response = await prePayment.handler(event, context);
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({ ok: true, details: "" });
  });

  it("Understands numbered columns", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {})({}, {})
      );
    const oldItems = await injectedWebflow.items();
    oldItems.items.forEach(i => {
      i['price-1'] = i.price;
      delete(i.price);
      i['inventory-1'] = i.inventory;
      delete(i.inventory);
    });
    injectedWebflow.items = () => Promise.resolve(oldItems);
    response = await prePayment.handler(event, {});
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({ ok: true, details: "" });
  });

  it("Rejects when any price is incorrect", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {
          price: false,
        })({}, {})
      );
    const context = {};
    response = await prePayment.handler(event, context);
    expect(response.statusCode).to.deep.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: "Prices do not match.",
      ok: false,
    });
  });

  it("Rejects when any inventory is insufficient", async () => {
    let response = await insufficientInventoryRequest();
    expect(response.statusCode).to.deep.equal(200);
    let body = JSON.parse(response.body);
    expect(body.details).to.match(/^Insufficient inventory for these items:/);
    const event = mockFoxyCart.request({ price: 11, quantity: "99999999" });
    response = await insufficientInventoryRequest(event);
    expect(response.statusCode).to.deep.equal(200);
    body = JSON.parse(response.body);
    expect(body.details).to.match(/^Insufficient inventory for these items:/);
  });

  it("Inventory field can be negative", async () => {
    const event = mockFoxyCart.request({ price: 11, quantity: " 1 ", inventory: "0" });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {
          inventory: () => " -2 ",
        })({}, {})
      );
    const context = {};
    context.FX_RESPONSE = await prePayment.handler(event, context);
    const body = JSON.parse(context.FX_RESPONSE.body);
    expect(body.details).to.match(/^Insufficient inventory for these items:/);
  });

  it("Inventory field is case insensitive", async () => {
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {
          inventory: increaseFrom(0),
        })({}, {})
      );
    const oldItems = await injectedWebflow.items();
    oldItems.items.forEach(i => {
      i.InVeNtOrY = i.inventory;
      delete(i.inventory);
    });
    injectedWebflow.items = () => Promise.resolve(oldItems);
    const context = {};
    context.FX_RESPONSE = await prePayment.handler(event, context);
    const body = JSON.parse(context.FX_RESPONSE.body);
    expect(body.details).to.match(/^Insufficient inventory for these items:/);
  });

  it("Returns not found if the code is not in Webflow", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    const respContent = mockWebflow.arbitrary(items, {})({}, {})
    respContent.items.forEach(i => i.mysku = 'WrongSku');
    injectedWebflow.items = () => Promise.resolve(respContent);
    response = await prePayment.handler(event, {});
    const body = JSON.parse(response.body);
    expect(body).to.exist;
    expect(body.ok).to.equal(false);
    expect(body.details).to.contain("An internal error has occurred");
  });

  it("Rejects when no code field exist", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    let hundred = [];
    for (let i = 0; i<10; i++) {
      hundred = hundred.concat(items);
    }
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(hundred, {}, [
          "mysku",
        ])({}, {})
      );
    response = await prePayment.handler(event, {});
    expect(response.statusCode).to.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
    expect(logError.getCalls()[0].args[0]).to.match(/Could not find the code field/);

  });

  it("Rejects when provided custom field does not exist", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {}, ["mysku"])(
          {},
          {}
        )
      );
    const context = {};
    response = await prePayment.handler(event, context);
    expect(response.statusCode).to.deep.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
  });

  it("Returns Rate limit exceeded when Webflow limit is exceeded", async () => {
    let response;
    const event = mockFoxyCart.request();
    const err = new Error();
    err.code = 500;
    injectedWebflow.items = () => Promise.reject(err);
    const context = {};
    response = await prePayment.handler(event, context);
    expect(response.statusCode).to.deep.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
  });

  it("Fetches each collection page only once", async () => {
    let counting = 0;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  JSON.parse(event.body)._embedded["fx:items"];
    injectedWebflow.items = function () {
      counting += 1;
      return Promise.resolve(
        mockWebflow.arbitrary(items)({}, {})
      );
    };
    const context = {};
    await prePayment.handler(event, context);
    expect(counting).to.equal(1);
  });
});

/**
 * Returns a response for a request with insufficient inventory.
 *
 * @returns {object} the insufficient inventory response
 */
async function insufficientInventoryRequest(event = null) {
  if (!event) {
    event = mockFoxyCart.request({ price: 11, quantity: 1 });
  }
  const items =  JSON.parse(event.body)._embedded["fx:items"];
  injectedWebflow.items = () =>
    Promise.resolve(
      mockWebflow.arbitrary(items, {
        inventory: increaseFrom(0),
      })({}, {})
    );
  const context = {};

  context.FX_RESPONSE = await prePayment.handler(event, context);
  return context.FX_RESPONSE;
}
