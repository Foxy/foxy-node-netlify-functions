const { beforeEach, describe, it } = require("mocha");
const {CartValidator} = require("../../src/foxy/CartValidator.js");
const chai = require("chai");
const expect = chai.expect;


describe("Cart Validator", function() {

  describe("Validate prices", function() {
    let cartValidator;

    beforeEach(
      function() {
        cartValidator = new CartValidator();
      }
    );

    it ("Accept valid prices.", function () {
      const cases = [
        [{price: 10}, {price: 10}],
        [{price: 10.0}, {price: 10}],
        [{price: 10.0}, {price: 10.0}],
        [{price: 10}, {price: 10.0}],
        [{price: '10'}, {price: 10.0}],
        [{price: 10}, {price: '10.0'}],
        [{price: 0}, {price: 0}],
        [{price: 0}, {price: '0.0'}]
      ];
      for(let c of cases) {
        expect(cartValidator.validPrice(c[0], c[1])).to.be.true;
      }
    });

    it ("Reject invalid prices.", function () {
      const cases = [
        [{price: 0}, {price: 100}],
        [{price: "10.0"}, {price: "01.00"}],
        [{price: "10"}, {price: "01"}],
        [{price: 10}, {price: 1}],
      ];
      for(let c of cases) {
        expect(cartValidator.validPrice(c[0], c[1])).to.be.false;
      }
    });

    it ("Reject empty prices.", function () {
      const cases = [
        [{price: undefined}, {price: 1}],
        [{Price: 10}, {price: 1}],
        [{foo: 10}, {price: 1}],
      ];
      for(let c of cases) {
        expect(cartValidator.validPrice(c[0], c[1])).to.be.false;
      }
    });

    it ("Accept non-existing canonical prices.", function () {
      const cases = [
        [{price: undefined}, {Price: 1}],
        [{Price: 0}, {price: undefined}]
      ];
      for(let c of cases) {
        expect(cartValidator.validPrice(c[0], c[1])).to.be.true;
      }
    });

    it ("Skip codes configured to skip prices.", function () {
      cartValidator.skipPrice('foo');
      cartValidator.skipInventory('bar');
      const cases = [
        // [cart, canonical, pricecheck, inventorycheck]
        [ {price: 2, quantity: 1}, {price: "2", inventory: 10}, true, true ],
        [ {price: 2, quantity: 1}, {price: "20", inventory: 10}, false, true ],
        [ {price: 2, quantity: 2}, {price: "2", inventory: 1}, true, false ],
        [ {price: 2, quantity: 2}, {price: "12", inventory: 1}, false, false ],
        [ {price: 2, quantity: 1}, {price: "2", inventory: 10}, true, true ],
        [ {price: 2, quantity: 1}, {price: "20", inventory: 10}, false, true ],
        [ {price: 2, quantity: 2}, {price: "2", inventory: 1}, true, false ],
        [ {price: 2, quantity: 2}, {price: "12", inventory: 1}, false, false ],
      ];
      for (let code of ['foo', 'bar', 'baz']) {
        for (let c of cases) {
          c[0].code = code;
          c[1].code = code;
          if (code === 'foo') {
            expect(cartValidator.validPrice(c[0], c[1])).to.be.true;
          } else {
            expect(cartValidator.validPrice(c[0], c[1])).to.equal(c[2])
          }
          if (code === 'bar') {
            expect(cartValidator.validInventory(c[0], c[1])).to.be.true;
          } else {
            expect(cartValidator.validInventory(c[0], c[1])).to.equal(c[3])
          }
        }
      }
    });

  });

});
