const rewire = require("rewire");
const sinon = require("sinon");
const { expect } = require("chai");
const { describe, it, beforeEach } = require("mocha");

const prePayment = rewire("./pre-payment-webhook-webflow");
const mockFoxyCart = require("./mock/foxyCart");
const mockWebflow = require("./mock/webflow");

let injectedWebflow;

const internalErrorMessage = "An internal error has occurred";

/**
 * @param number
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
  it("Validate the request is from FoxyCart.");

  it("Gets the webflow api instance with the token from the environment variable", () => {
    prePayment.__set__("process.env", { WEBFLOW_TOKEN: "foobar" });
    const getToken = prePayment.__get__("getToken");
    expect(getToken()).to.equal("foobar");
    const getWebflow = prePayment.__get__("getWebflow");
    expect(getWebflow().token).to.equal("foobar");
  });

  it("Only executes if there is a WEBFLOW_TOKEN set", async () => {
    /**
     * @param error
     * @param response
     */
    function noToken(error, response) {
      expect(JSON.parse(response.body).ok).to.equal(false);
      expect(JSON.parse(response.body).details).to.equal(
        "Webflow token not configured."
      );
    }
    /**
     * @param error
     * @param response
     */
    function withToken(error, response) {
      expect(response.details).not.to.equal("Webflow token not configured.");
    }
    prePayment.__set__("process.env", {});
    await prePayment.handler(null, null, noToken);
    prePayment.__set__("process.env.WEBFLOW_TOKEN", "FOOBAR");
    await prePayment.handler(null, null, withToken);
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
  beforeEach(() => {
    injectedWebflow = {
      items: () => Promise.reject(new Error("Mocked function")),
    };
    prePayment.__set__("getWebflow", () => injectedWebflow);
    prePayment.__set__("process.env.WEBFLOW_TOKEN", "FOOBAR");
    process.env['FX_FIELD_CODE'] = 'mysku';
  });

  afterEach(() => {
    const toReset = [
      'FX_EDITABLE_PRICE_CODES',
      'FX_ERROR_CATEGORY_MISMATCH',
      'FX_ERROR_INSUFFICIENT_INVENTORY',
      'FX_ERROR_PRICE_MISMATCH',
      'FX_FIELD_CODE',
      'FX_FIELD_PRICE',
      'FX_SKIP_INVENTORY_CODES',
      'FX_SKIP_PRICE_CODES',
      'FX_FIELD_INVENTORY',
    ];
    toReset.forEach(e => process.env[e] = '');
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
      process.env['FX_SKIP_PRICE_CODES'] = 'editable';
      const event = mockFoxyCart.request({ code: 'editable', price: 0.1, quantity: 1 });
      const items =  event.body._embedded["fx:items"];
      event.body = JSON.stringify(event.body);
      injectedWebflow.items = () =>
        Promise.resolve(
          mockWebflow.arbitrary(items, {
            mysku: 'editable',
            price: false
          })({}, {})
        );
      await prePayment.handler(event, {}, (err, resp) => {response = resp;});
      expect(response.statusCode).to.deep.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        details: "",
        ok: true,
      });
    });

    it("Ignores inventory checks if FX_FIELD_INVENTORY is set to null or false", async () => {
      const event = mockFoxyCart.request({ price: 11, quantity: 11 });
      process.env['FX_FIELD_INVENTORY'] = 'Null';
      const response = await insufficientInventoryRequest(event);
      expect(response.statusCode).to.exist.and.to.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({ ok: true, details: "" });
    });

    it("Ignores inventory checks if no such field exist in Webflow", async () => {
      let response;
      const event = mockFoxyCart.request({ price: 11, quantity: 999999999 });
      const items =  event.body._embedded["fx:items"];
      event.body = JSON.stringify(event.body);
      injectedWebflow.items = () =>
        Promise.resolve(
          mockWebflow.arbitrary(items, {}, ['inventory'])({}, {})
        );
      await prePayment.handler(event, {}, (err, resp) => {response = resp;});
      expect(response.statusCode).to.deep.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        details: "",
        ok: true,
      });
    });

    it("Ignores inventory checks for codes excluded with FX_SKIP_INVENTORY_CODES", async () => {
      let response;
      process.env['FX_SKIP_INVENTORY_CODES'] = 'limitless';
      const event = mockFoxyCart.request({ code: 'limitless', price: 11, quantity: 100 });
      const items =  event.body._embedded["fx:items"];
      event.body = JSON.stringify(event.body);
      injectedWebflow.items = () =>
        Promise.resolve(
          mockWebflow.arbitrary(items, {
            inventory: () => 1
          })({}, {})
        );
      await prePayment.handler(event, {}, (err, resp) => {response = resp;});
      expect(response.statusCode).to.deep.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        details: "",
        ok: true,
      });
    });

  });

  it("Evaluates new subscriptions", async () => {
    let response;
    const event = subscriptionsWithStartDate(
      ((d) => new Date(d.setDate(d.getDate() + 1)))(new Date())
    );
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(JSON.parse(event.body)._embedded["fx:items"], {
          price: false,
        })({}, {})
      );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
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
    const items = event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {
          price: false,
        })({}, {})
      );
    await prePayment.handler(event, {}, (err, resp) => {
      response = resp;
    });
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
    const errorLog = sinon.stub(console, 'log');
    for (const [key, regex] of Object.entries(invalidItemOptions)) {
      errorLog.resetHistory();
      let response;
      const changes = {};
      if (key === 'collection_id') {
        changes['options'] = {collection_id: false};
      } else {
        changes[key] = false;
      }
      const event = mockFoxyCart.request(changes);
      event.body = JSON.stringify(event.body);
      // Make sure the response values matches
      injectedWebflow.items = function () {
        return Promise.resolve(mockWebflow.arbitrary(items)());
      };
      await prePayment.handler(event, {}, (err, resp) => {
        response = resp;
      });
      expect(response.statusCode).to.equal(200);
      const body = JSON.parse(response.body);
      expect(body).to.exist;
      expect(body.ok).to.equal(false);
      expect(body.details).to.contain("Invalid items");
      const matchedError = errorLog.getCalls().find(c => c.args[2]);
      expect(matchedError).to.exist;
      expect(matchedError.args[2]).to.match(regex);
    }
    errorLog.restore();

  });

  it("Approves when all items are correct", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    // Make sure the response values matches
    injectedWebflow.items = function () {
      return Promise.resolve(
        mockWebflow.arbitrary(items)({}, {}, [
          "category",
        ])
      );
    };
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({ ok: true, details: "" });
  });

  it("Rejects when any price is incorrect", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {
          price: false,
        })({}, {})
      );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.deep.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: "Prices do not match.",
      ok: false,
    });
  });

  it("Rejects when any category is incorrect", async () => {
    let response;
    const event = mockFoxyCart.request();
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(
          items,
          { category: () => "WrongCategory" },
        )({}, {})
      );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.deep.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal({
      ok: false,
      details: "Mismatched category.",
    });
  });

  it("Rejects when any inventory is insufficient", async () => {
    const response = await insufficientInventoryRequest();
    expect(response.statusCode).to.deep.equal(200);
    const body = JSON.parse(response.body);
    expect(body.details).to.match(/^Insufficient inventory for these items:/);
  });

  it("Inventory field is case insensitive", async () => {
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
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
    await prePayment.handler(event, context, (err, resp) => {
      context.FX_RESPONSE = resp;
    });
    const body = JSON.parse(context.FX_RESPONSE.body);
    expect(body.details).to.match(/^Insufficient inventory for these items:/);
  });

  it("Customizes the insufficient inventory response", async () => {
    process.env.FX_ERROR_INSUFFICIENT_INVENTORY = 'foobar: ';
    const response = await insufficientInventoryRequest();
    expect(response.statusCode).to.deep.equal(200);
    const body = JSON.parse(response.body);
    expect(body.details).to.match(/^foobar: /);
  });

  it("Returns not found if the code is not in Webflow", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    const respContent = mockWebflow.arbitrary(items, {})({}, {})
    respContent.items.forEach(i => i.mysku = 'WrongSku');
    injectedWebflow.items = () => Promise.resolve(respContent);
    await prePayment.handler(event, {}, (err, resp) => {
      response = resp;
    });
    const body = JSON.parse(response.body);
    expect(body).to.exist;
    expect(body.ok).to.equal(false);
    expect(body.details).to.contain("An internal error has occurred");
  });

  it("Rejects when no code field exist", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    const logStub = sinon.stub(console, 'log');
    let hundred = [];
    for (let i = 0; i<10; i++) {
      hundred = hundred.concat(items);
    }
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(hundred, {}, [
          "mysku",
        ])({}, {})
      );
    await prePayment.handler(event, {}, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
    expect(logStub.getCalls()[0].args[0]).to.match(/Could not find the code field/);
    logStub.restore();
  });

  it("Rejects when provided custom field does not exist", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {}, ["mysku"])(
          {},
          {}
        )
      );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.deep.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
  });

  it("Returns Bad Request when no body is provided", async () => {
    let response;
    const event = {};
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(event.body._embedded["fx:items"])({}, {})
      );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.deep.equal(400);
    expect(JSON.parse(response.body)).to.deep.equal({
      ok: false,
      details: "Empty request.",
    });
  });

  it("Returns Rate limit exceeded when Webflow limit is exceeded", async () => {
    let response;
    const event = mockFoxyCart.request();
    event.body = JSON.stringify(event.body);
    const err = new Error();
    err.code = 500;
    injectedWebflow.items = () => Promise.reject(err);
    const context = {};
    await prePayment.handler(event, context, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.deep.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
  });

  it("Fetches each collection page only once", async () => {
    let counting = 0;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = function () {
      counting += 1;
      return Promise.resolve(
        mockWebflow.arbitrary(items)({}, {})
      );
    };
    const context = {};
    await prePayment.handler(event, context, () => {});
    expect(counting).to.equal(1);
  });
});

/**
 * Returns a response for a request with insufficient inventory.
 *
 * @returns {object} the insuficient inventory response
 */
async function insufficientInventoryRequest(event = null) {
  if (!event) {
    event = mockFoxyCart.request({ price: 11, quantity: 1 });
  }
  const items =  event.body._embedded["fx:items"];
  event.body = JSON.stringify(event.body);
  injectedWebflow.items = () =>
    Promise.resolve(
      mockWebflow.arbitrary(items, {
        inventory: increaseFrom(0),
      })({}, {})
    );
  const context = {};

  await prePayment.handler(event, context, (err, resp) => {
    context.FX_RESPONSE = resp;
  });
  return context.FX_RESPONSE;
}
