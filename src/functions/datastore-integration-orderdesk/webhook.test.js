const rewire = require("rewire");
const { expect } = require("chai");
const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const { prePayment, response, transactionCreated } = require("./webhook.js");

describe("Pre-payment Webhook", function() {
  describe("Validates the cart items prices agains a datastore", function() {
    it("Accepts if the prices are the same", function () {
      const result = prePayment();
    });
    it("Accepts prices zero");
    it("Accepts if the datastore has no price");
    it("Rejects if the prices are different");
    it("Rejects if the cart has no price and the datastore does");
  });

  describe("Validates the cart items quantities agains a datastore", function() {
    it("Accepts if the quantity is the same or lower as the inventory");
    it("Accepts if the quantity is zero");
    it("Accepts if the the inventory field is null");
    it("Rejects if the quantity is higher");
    it("Rejects if the cart quantity is null and the inventory is not");
  });

  describe("Responds useful messages", function () {
    it("Informs the invalid items when the price is wrong.");
    it("Informs the items with insuficient inventory and the current available inventory.");
  });
});

describe("Transaction Created Webhook", function() {
  describe("Updates the datastore", function() {
    it("Deduces the quantity from the inventory.");
    it("Sets Foxy.io OrderDesk Webhook as the update method");
  });

  describe("Responds useful messages", function() {
    it("Informs Foxy.io that the update was not successful.");
  });

});
