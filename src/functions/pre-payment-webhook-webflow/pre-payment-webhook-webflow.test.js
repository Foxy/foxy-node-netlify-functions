const rewire = require('rewire');
const { expect } = require('chai');
const { describe, it, beforeEach } = require('mocha');

const prePayment = rewire('./pre-payment-webhook-webflow');
const mockFoxyCart = require('./mock/foxyCart');
const mockWebflow = require('./mock/webflow');

let injectedWebflow;

function increaseFrom(number) {
  let count = number;
  return () => {
    const temp = count;
    count += 1;
    return temp;
  };
}

describe('Initialize and validate the webhook', () => {
  it('Validate the request is from FoxyCart.');

  it('Gets the webflow api instance with the token from the environment variable', () => {
    prePayment.__set__('process.env', {WEBFLOW_TOKEN: 'foobar' });
    const getToken = prePayment.__get__('getToken');
    expect(getToken()).to.equal('foobar');
    const getWebflow = prePayment.__get__('getWebflow');
    expect(getWebflow().token).to.equal('foobar');
  });

  it('Only executes if there is a WEBFLOW_TOKEN set', async () => {
    function noToken(error, response) {
      expect(JSON.parse(response.body).ok).to.equal(false);
      expect(JSON.parse(response.body).details).to.equal('Webflow token not configured.');
    }
    function withToken(error, response) {
      expect(response.details).not.to.equal('Webflow token not configured.');
    }
    prePayment.__set__('process.env', {});
    await prePayment.handler(null, null, noToken);
    prePayment.__set__('process.env.WEBFLOW_TOKEN', 'FOOBAR');
    await prePayment.handler(null, null, withToken);
  });

  it('Extracts the items from FoxyCart payload', async () => {
    const extractItems = prePayment.__get__('extractItems');
    let items = extractItems({});
    expect(items.length).to.equal(0);
    items = extractItems(mockFoxyCart.basic());
    expect(items.length).to.equal(10);
    items = extractItems(mockFoxyCart.longCollection());
    expect(items.length).to.equal(100);
  });

  it('Identifies the price, quantity and code fields', async () => {
    const extractItems = prePayment.__get__('extractItems');
    const getCustomItemOption = prePayment.__get__('getCustomItemOption');
    const items = extractItems(mockFoxyCart.longCollection());
    items.forEach((i) => {
      expect(Number(getCustomItemOption(i, 'price'))).to.be.a('number');
      expect(Number(getCustomItemOption(i, 'quantity'))).to.be.a('number');
      expect(Number(getCustomItemOption(i, 'inventory'))).to.be.a('number');
    });
    expect(items.length).to.equal(100);
  });
});

describe('Verifies the price of an item in a Webflow collection', () => {
  beforeEach(() => {
    injectedWebflow = {
      items: () => Promise.reject(new Error('Mocked function')),
    };
    prePayment.__set__('getWebflow', () => injectedWebflow);
    prePayment.__set__('process.env.WEBFLOW_TOKEN', 'FOOBAR');
  });

  function subscriptionsWithStartDate(startDate) {
    const nextMonth = ((d) => new Date(d.setDate(d.getMonth() + 1)))(new Date());
    const nextYear = ((d) => new Date(d.setDate(d.getYear() + 1)))(new Date());
    const event = mockFoxyCart.request(
      {
        subscription_frequency: '1m',
        subscription_start_date: startDate.toISOString(),
        subscription_next_transaction_date: nextMonth.toISOString(),
        subscription_end_date: nextYear.toISOString(),
        sub_frequency: '1m',
        price: 21,
        quantity: 1,
      },
      mockFoxyCart.itemBuilders.subscriptionItem,
    );
    return event;
  }

  it('Evaluates new subscriptions', async () => {
    let response;
    const event = subscriptionsWithStartDate(
      ((d) => new Date(d.setDate(d.getDate() + 1)))(new Date()),
    );
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'], {
          price: false,
        },
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal(
      { ok: false, details: 'Prices do not match.' },
    );
  });

  it('Ignore existing subscriptions.', async () => {
    let response;
    const event = subscriptionsWithStartDate(
      ((d) => new Date(d.setDate(d.getDate() - 1)))(new Date()),
    );
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'], {
          price: false,
        },
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal(
      { ok: true, details: '' },
    );
  });

  it('Reject when the price option modifier has no corresponded discount in Webflow.');

  it('Approves when all items are correct', async () => {
    let response;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    // Make sure the response values matches
    injectedWebflow.items = function () {
      return Promise.resolve(
        mockWebflow.arbitrary(
          event.body._embedded['fx:items'],
        )({}, {}, ['category', 'category_field']),
      );
    };
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.exist.and.to.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal(
      { ok: true, details: '' },
    );
  });

  it('Rejects when any price is incorrect', async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'], {
          price: false,
        },
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal(
      { ok: false, details: 'Prices do not match.' },
    );
  });

  it('Rejects when any category is incorrect', async () => {
    let response;
    const event = mockFoxyCart.request();
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'],
        { category: () => 'WrongCategory' }, ['category_field']
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal(
      {
        ok: false,
        details: 'Mismatched category.',
      },
    );
  });

  it('Rejects when any inventory is insufficient', async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'], {
          inventory: increaseFrom(0),
        },
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(200);
    expect(JSON.parse(response.body)).to.deep.equal(
      { ok: false, details: 'Insufficient inventory.' },
    );
  });

  it('Rejects when no code field exist', async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'], {
        },
        ['mysku', 'code_field', 'code'],
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(400);
    expect(JSON.parse(response.body)).to.deep.equal(
      {
        ok: false,
        details: 'Wrong code_field.',
      },
    );
  });

  it('Rejects when provided custom field does not exist', async () => {
    let response;
    const event = mockFoxyCart.request({ price: 21, quantity: 1 });
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body._embedded['fx:items'], { }, ['mysku'],
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(400);
    expect(JSON.parse(response.body)).to.deep.equal(
      {
        ok: false,
        details: 'Wrong code_field.',
      },
    );
  });

  it('Returns Bad Request when no body is provided', async () => {
    let response;
    const event = {};
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(event.body._embedded['fx:items'])({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(400);
    expect(JSON.parse(response.body)).to.deep.equal(
      {
        ok: false,
        details: 'Empty request.',
      },
    );
  });

  it('Returns Rate limit exceeded when Weflow limit is exceeded', async () => {
    let response;
    const event = mockFoxyCart.request();
    const err = new Error();
    err.code = 429;
    injectedWebflow.items = () => Promise.reject(err);
    const context = {};
    await prePayment.handler(event, context, (err, resp) => { response = resp; });
    expect(response.statusCode).to.deep.equal(429);
    expect(JSON.parse(response.body)).to.deep.equal(
      {
        ok: false,
        details: 'Rate limit reached.',
      },
    );
  });

  it('Fetches each collection page only once', async () => {
    let counting = 0;
    const event = mockFoxyCart.request({ price: 11, quantity: 1 });
    injectedWebflow.items = function () {
      counting += 1;
      return Promise.resolve(
        mockWebflow.arbitrary(
          event.body._embedded['fx:items'],
        )({}, {}),
      );
    };
    const context = {};
    await prePayment.handler(event, context, () => {});
    expect(counting).to.equal(1);
  });
});
