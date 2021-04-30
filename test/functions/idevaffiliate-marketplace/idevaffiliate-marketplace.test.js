const IdevAffiliate = require("../../../src/functions/idevaffiliate-marketplace/idevaffiliate-marketplace.js");
const MockFoxyRequests = require("../../MockFoxyRequests.js");
const { before, beforeEach, describe, it } = require("mocha");
const chai = require("chai");
const { config } = require("../../../config.js");
const nock = require("nock");

const expect = chai.expect;

let sentRequests = [];

describe("Idev Affiliate", function() {

  before(
    function () {
      config.foxy.api.clientId = 'foo';
    }
  );

  beforeEach(
    function () {
      sentRequests = [];
    }
  );

  it ("Should validate requests", async function () {
    const response = await IdevAffiliate.handler({});
    expect(response.statusCode).to.equal(400);
    expect(JSON.parse(response.body).details).to.equal("Payload is not valid JSON.");
  });

  it ("Should inform of unsupported evets", async function () {
    const request = MockFoxyRequests.validRequest();
    request.headers['foxy-webhook-event'] = 'validation/payment';
    const response = await IdevAffiliate.handler(request);
    expect(response.statusCode).to.equal(501);
    expect(JSON.parse(response.body).details).to.equal("Unsupported event.");
  });

  it ("Should send items to Idev Affiliate", async function () {
    config.idevAffiliate.apiUrl = 'http://idev.com/api';
    config.foxy.webhook.encryptionKey = 'foxy';

    nock('http://idev.com')
      .post('/api', body => body['affiliate_id'] && body['idev_saleamt'] && body['idev_ordernum'])
      .twice()
      .reply(200, {});
    const request = MockFoxyRequests.validRequest({
      _embedded: {
        'fx:items': [
          {code: 'foo-a123', name: 'foo', price: 1},
          {code: 'bar-a234', name: 'bar', price: 2},
        ]
      },
      id: 123,
    });
    request.headers['foxy-webhook-event'] = 'transaction/created';
    const response = await IdevAffiliate.handler(request);
    expect(sentRequests.map(i => i[1].body)
      .every(i => i.has('affiliate_id') &&
        i.has('idev_saleamt') &&
        i.has('idev_ordernum')
      )).to.be.true;
    expect(response.statusCode).to.equal(200);
  });

});
