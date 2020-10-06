const rewire = require('rewire');
const { expect } = require('chai');
const { describe, it } = require('mocha');

const prePayment = rewire('./pre-payment-webhook-webflow');
const { basicRequest, longCollection } = require('./mock/request');

const MockWebFlow = {
  items({ collectionId }, query = {}) {
    return {};
  },
};

prePayment.__set__('getWebflow', () => MockWebFlow);

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
    let items = extractItems(basicRequest);
    expect(items.length).to.equal(2);
    items = extractItems(longCollection);
    expect(items.length).to.equal(100);
  });

  it('Identifies the price, quantity and code fields', async function() {
    const extractItems = prePayment.__get__('extractItems');
    const getCustomItemOption = prePayment.__get__('getCustomItemOption');
    const items = extractItems(longCollection);
    for (let i of items) {
      expect(Number(getCustomItemOption(i, 'price'))).to.be.a('number');
      expect(Number(getCustomItemOption(i, 'quantity'))).to.be.a('number');
      expect(Number(getCustomItemOption(i, 'inventory'))).to.be.a('number');
    }
    expect(items.length).to.equal(100);
  });

  it('Approves when all items are correct');
  it('Rejects when any price is incorrect');
  it('Rejects when provided custom field does not exist');
  it('Rejects when any quantity over inventory');
  it('Returns Bad Request when no body is provided');
  it('Returns Rate limit exceeded when Weflow limit is exceeded');

});
