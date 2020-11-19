const rewire = require("rewire");
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
  });

  /**
   * @param startDate
   */
  function subscriptionsWithStartDate(startDate) {
    const nextMonth = ((d) => new Date(d.setDate(d.getMonth() + 1)))(
      new Date()
    );
    const nextYear = ((d) => new Date(d.setDate(d.getYear() + 1)))(new Date());
    const event = mockFoxyCart.request(
      {
        subscription_frequency: "1m",
        subscription_start_date: startDate.toISOString(),
        subscription_next_transaction_date: nextMonth.toISOString(),
        subscription_end_date: nextYear.toISOString(),
        sub_frequency: "1m",
        price: 21,
        quantity: 1,
      },
      mockFoxyCart.itemBuilders.subscriptionItem
    );
    return event;
  }

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
      ok: false,
      details: "Prices do not match.",
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

  it(
    "Reject when the price option modifier has no corresponded discount in Webflow."
  );

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
          "category_field",
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
      ok: false,
      details: "Prices do not match.",
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
          ["category_field"]
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

  it("Customizes the insufficient inventory response", async () => {
    process.env.FX_ERROR_INSUFFICIENT_INVENTORY = 'foobar: ';
    const response = await insufficientInventoryRequest();
    expect(response.statusCode).to.deep.equal(200);
    const body = JSON.parse(response.body);
    expect(body.details).to.match(/^foobar: /);
  });

  it("Rejects when no code field exist", async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    const items =  event.body._embedded["fx:items"];
    event.body = JSON.stringify(event.body);
    injectedWebflow.items = () =>
      Promise.resolve(
        mockWebflow.arbitrary(items, {}, [
          "mysku",
          "code_field",
          "code",
        ])({}, {})
      );
    await prePayment.handler(event, {}, (err, resp) => {
      response = resp;
    });
    expect(response.statusCode).to.deep.equal(500);
    expect(JSON.parse(response.body)).to.deep.equal({
      details: internalErrorMessage,
      ok: false,
    });
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

  it("Returns Rate limit exceeded when Weflow limit is exceeded", async () => {
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
async function insufficientInventoryRequest() {
  const event = mockFoxyCart.request({ price: 11, quantity: 1 });
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