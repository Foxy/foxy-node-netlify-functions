const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const {expect} = require("chai");

const crypto = require("crypto");
const rewire = require("rewire");

const odHandler = rewire("./index.js");
const config = odHandler.__get__('config');

describe("Order Desk Pre-payment Webhook", function() {
  beforeEach(
    function () {
      config.datastore.provider.orderDesk.storeId = 'foo';
      config.datastore.provider.orderDesk.apiKey =  'bar';
      config.foxy.webhook.encryptionKey =  'key';
    }
  );


  describe("Orderdesk webhook configuration.", function() {
    describe ("Should warn about configuration errors", function () {
      const cases = [
        ["Orderdesk store id", () => config.datastore.provider.orderDesk.storeId = undefined],
        ["Orderdesk API key", () => config.datastore.provider.orderDesk.apiKey = undefined],
        ["Foxy encryption key", () => config.foxy.webhook.encryptionKey = undefined],
      ];
      for (let c of cases) {
        it(`Warns about ${c[0]}`, async function() {
          c[1]();
          const response = await odHandler.handler();
          expect(response.statusCode).to.equal(503);
          expect(JSON.parse(response.body).details).to.match(/Service Unavailable/);
        });
      }
    });
  });

  it ("Should return a Foxy Prepayment Webhook Response", async function () {
    const responsePromise = odHandler.handler();
    expect(responsePromise).to.be.a("Promise");
    const response = await responsePromise;
    expect(response.statusCode).to.exist;
    expect(response.body).to.exist;
    const body = JSON.parse(response.body);
    expect(body.details).to.exist;
    expect(body.ok).to.exist;
  });

  describe("Validates Foxy Requests", async function () {

    it("Should reject invalid Foxy Requests", async function () {
      config.foxy.webhook.encryptionKey = 'foo';
      const responsePromise = odHandler.handler({
        httpMethod: 'POST',
        headers: {
          'Foxy-Webhook-Signature': 'wrong'
        },
        body: '{"foo": "bar"}'
      });
      const response = await responsePromise;
      const body = JSON.parse(response.body);
      expect(body.ok).to.be.false;
      expect(body.details).to.equal('Forbidden');
    });

    it("Should accept valid Foxy Requests", async function() {
      const key = 'foxykey';
      config.foxy.webhook.encryptionKey = key;
      const responsePromise = odHandler.handler(validRequest());
      const response = await responsePromise;
      const body = JSON.parse(response.body);
      expect(body.ok).to.be.true;
      expect(body.details).to.equal('');
    });
  });

  describe("Routes Foxy Requests", async function () {
    let routed = {'prePayment': false, 'txCreated': false};
    let revert;
    const flagger = {
      prePayment: () => routed.prePayment = true,
      transactionCreated: () => routed.txCreated = true
    };
    beforeEach(() => {
      routed = {prePayment: false, txCreated: false};
      revert = odHandler.__set__('webhook', flagger);
    });

    afterEach(() => {
      revert();
    });

    it ("Invokes pre payment when foxy-webhook-event is validation/payment", () => {
      odHandler.handler(validRequest());
      expect(routed.prePayment).to.be.true;
      expect(routed.txCreated).to.be.false;
    });
    
    it ("Invokes transaction created when foxy-webhook-event is transaction/created", () => {
      const valid = validRequest();
      valid.headers['foxy-webhook-event'] = 'transaction/created';
      odHandler.handler(valid);
      expect(routed.prePayment).to.be.false;
      expect(routed.txCreated).to.be.true;
    });
    
  });

});

function validRequest(payload = null) {
  if (payload === null) {
    payload = {"foo": "bar"}; 
  }
  payload = JSON.stringify(payload)
  const foxySignature = crypto.createHmac('sha256', config.foxy.webhook.encryptionKey).update(payload).digest('hex');
  return {
        body: payload,
        headers: {
          'Foxy-Webhook-Signature': foxySignature,
          'foxy-webhook-event': 'validation/payment'
        },
        httpMethod: 'POST'
      };
}
