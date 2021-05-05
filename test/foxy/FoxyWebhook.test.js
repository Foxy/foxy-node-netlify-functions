const FoxyWebhook = require("../../src/foxy/FoxyWebhook.js");
const { after, before, describe, it } = require("mocha");
const chai = require("chai");
const crypto = require("crypto");
const sinon = require("sinon");

const {expect} = chai;

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

describe("Handles Foxy Webhook Requests", function() {
  let log;
  let logError;

  before(silenceLog);
  after(restoreLog);

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
  let log;
  let logError;

  before(silenceLog);
  after(restoreLog);

  it ("Should not accept error responses without details", function () {
    expect(() => FoxyWebhook.response("", 500)).to.throw(Error, /An error response needs to specify details/);
    expect(() => FoxyWebhook.response(null, 500)).to.throw(Error, /An error response needs to specify details/);
    expect(() => FoxyWebhook.response(undefined, 500)).to.throw(Error, /An error response needs to specify details/);
  });
});

describe("Verifies Foxy Webhook Signatures", function () {
  let log;
  let logError;

  before(silenceLog);
  after(restoreLog);
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

describe("Builds useful error messages", function() {
  let log;
  let logError;

  before(silenceLog);
  after(restoreLog);

  describe("Responds useful messages", function () {
    it("Informs the invalid items when the price is wrong.", async function () {
      const message = FoxyWebhook.messagePriceMismatch([
        [{name: 'foo'}, {name: 'foo'}],
        [{name: 'bar'}, {name: 'bar'}],
      ])
      expect(message).to.match(/foo/);
      expect(message).to.match(/bar/);
    });

    it("Informs the items with insufficient inventory and the current available inventory.", async function () {
      const message = FoxyWebhook.messageInsufficientInventory([
        [{name: 'foo', quantity:3}, {inventory: 2, name: 'foo'}],
        [{name: 'bar', quantity:3}, {inventory: 1, name: 'bar'}],
      ])
      expect(message).to.match(/2 available/);
      expect(message).to.match(/1 available/);
    });
  });
});
