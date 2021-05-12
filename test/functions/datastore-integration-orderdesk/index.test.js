const MockFoxyRequest = require("../../MockFoxyRequests.js");
const odHandler = require("../../../src/functions/datastore-integration-orderdesk/index.js");
const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const chai = require("chai");
const { config } = require("../../../config.js");
const sinon = require("sinon");
const nock = require("nock");

const expect = chai.expect;

let log;
let logError;
function silenceLog() {
  log = sinon.stub(console, 'log');
  logError = sinon.stub(console, 'error');
}

function restoreLog() {
  log.restore();
  logError.restore();
}

describe("Order Desk Pre-payment Webhook", function() {
  let log;
  let logError;

  before(silenceLog);
  after(restoreLog);
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
      ];
      for (let c of cases) {
        it(`Warns about ${c[0]}`, async function() {
          c[1]();
          const valid = validRequest();
          const response = await odHandler.handler(valid);
          expect(response.statusCode).to.equal(503);
          expect(JSON.parse(response.body).details).to.match(/Service Unavailable/);
        });
      }
    });
  });

  it ("Should return a Foxy Prepayment Webhook Response", async function () {
    const responsePromise = odHandler.handler('');
    expect(responsePromise).to.be.a("Promise");
    const response = await responsePromise;
    expect(response.statusCode).to.exist;
    expect(response.body).to.exist;
    const body = JSON.parse(response.body);
    expect(body.details).to.exist;
    expect(body.ok).to.exist;
  });

  describe("Validates Foxy Requests", async function () {

    it("Should reject requests with the wrong method", async function() {
      const valid = validRequest();
      const cases = ['GET', 'PUT', 'DELETE', 'PATCH'];
      for (let c of cases) {
        valid.httpMethod = c;
        const response = await odHandler.handler(valid);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).details).to.equal('Method not allowed');
      }
    });

    it("Should reject invalid Foxy Requests", async function () {
      config.foxy.webhook.encryptionKey = 'foo';
      const responsePromise = odHandler.handler({
        httpMethod: 'POST',
        headers: {
          'content-type': 'application/json',
          'foxy-webhook-signature': 'wrong'
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

});

const validRequest = MockFoxyRequest.validRequest;

