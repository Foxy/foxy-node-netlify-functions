const crypto = require("crypto");
const FoxyWebhook = require('../../src/foxy/FoxyWebhook.js');

const { expect } = require("chai");
const { describe, it } = require("mocha");



describe("Handles Foxy Webhook Requests", function() {

  describe("Should retrieve items from a Webhook Request", function() {
    it("Should retrieve items when they are present.", function() {
      expect(FoxyWebhook.getItems({_embedded: {'fx:items': [{}, {}]}}).length).to.equal(2);
    });

    it("Should return an empty list if fx:items is not available", function() {
      expect(FoxyWebhook.getItems({_embedded: {'items': [{}, {}]}}).length).to.equal(0);
      expect(FoxyWebhook.getItems({items: {'items': [{}, {}]}}).length).to.equal(0);
    });

  });
});

describe("Builds Foxy Webhook Responses", function() {

  it ("Should not accept error responses without details", function () {
    expect(() => FoxyWebhook.response("", 500)).to.throw(Error, /An error response needs to specify details/);
    expect(() => FoxyWebhook.response(null, 500)).to.throw(Error, /An error response needs to specify details/);
    expect(() => FoxyWebhook.response(undefined, 500)).to.throw(Error, /An error response needs to specify details/);
  });
});

describe("Verifies Foxy Webhook Signatures", function () {
  it("Accepts the correct signature",function () {
    const foxySignature = crypto.createHmac('sha256', 'foo').update('bar').digest('hex');
    expect(FoxyWebhook.validSignature('bar', foxySignature, 'foo')).to.be.true;
  });

  it("Rejects incorrect signatures",function () {
    const cases = [0, 1, 2];
    for (let c of cases) {
      const foxySignature = crypto.createHmac('sha256', 'foo').update('bar').digest('hex');
      const values = ['bar', foxySignature, 'foo'];
      values[c] = 'wrong';
      expect(FoxyWebhook.validSignature(...values)).to.be.false;
      values[c] = undefined;
      expect(FoxyWebhook.validSignature(...values)).to.be.false;
    }
  });
});
