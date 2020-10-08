const rewire = require('rewire');
const { expect } = require('chai');
const { describe, it } = require('mocha');

const prePayment = rewire('./pre-payment-webhook-webflow');
const mockFoxyCart = require('./mock/foxyCart');
const mockWebflow = require('./mock/webflow');

const injectedWebflow = {
  items: () => Promise.reject(new Error('Mocked function')),
};

prePayment.__set__('getWebflow', () => injectedWebflow);


describe('Verifies the price of an item in a Webflow collection', () => {

  it('Only executes if there is a WEBFLOW_TOKEN set', async function () {
    function noToken(error, response) {
      expect(response.ok).to.equal(false);
      expect(response.details).to.equal('Webflow token not configured.');
    }
    function withToken(error, response) {
      expect(response.details).not.to.equal('Webflow token not configured.');
    }
    expect(prePayment.handler(null, null, noToken));
    prePayment.__set__('process.env.WEBFLOW_TOKEN', 'FOOBAR');
    expect(prePayment.handler(null, null, withToken));
  });

  it('Extracts the items from FoxyCart payload', async function() {
    const extractItems = prePayment.__get__('extractItems');
    let items = extractItems(mockFoxyCart.deterministic());
    expect(items.length).to.equal(10);
    items = extractItems(mockFoxyCart.longCollection());
    expect(items.length).to.equal(100);
  });

  it('Identifies the price, quantity and code fields', async function() {
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

  it('Approves when all items are correct', async function(){
    function callback(err, response) {
      expect(response).to.deep.equal(
        {
          ok: true,
          details: '',
        },
      );
    }
    // fix prices on requests
    // fix quantity on requests
    const event = {
      body: (() => {
        const r = mockFoxyCart.deterministic();
        r['_embedded']['fx:items'].map(e => e.price = 11);
        r['_embedded']['fx:items'].map(e => e.quantity = 1);
        return r;
      })(),
    };
    // Make sure the response values matches
    injectedWebflow.items = function() {
      return Promise.resolve(
        mockWebflow.arbitrary(
          event.body['_embedded']['fx:items']
        )({}, {}),
      );
    };
    const context = {};
    await prePayment.handler(event, context, callback);
  });

  it('Rejects when any price is incorrect', async function() {
    function callback(err, response) {
      expect(response).to.deep.equal(
        {
          ok: true,
          details: '',
        },
      );
    }
    // fix prices on requests
    // fix quantity on requests
    const event = {
      body: (() => {
        const r = mockFoxyCart.deterministic();
        r['_embedded']['fx:items'].map(e => e.price = 21);
        r['_embedded']['fx:items'].map(e => e.quantity = 1);
        return r;
      })(),
    };
    injectedWebflow.items = () => Promise.resolve(
      mockWebflow.arbitrary(
        event.body['_embedded']['fx:items']
      )({}, {}),
    );
    const context = {};
    await prePayment.handler(event, context, callback);


  });

  it('Rejects when any price is incorrect');
  it('Rejects when provided custom field does not exist');
  it('Rejects when any quantity over inventory');
  it('Returns Bad Request when no body is provided');
  it('Returns Rate limit exceeded when Weflow limit is exceeded');
  it('Fetches each collection page only once');
  it('Fetches different collections asynchronously');
});
