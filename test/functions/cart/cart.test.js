const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const chai = require("chai");
const rewire = require("rewire");
const chaiHttp = require('chai-http');
const app = rewire('../../../src/functions/cart/cart.js');
const config = app.__get__('config');

class MockFoxy {
  /**
   * @param {string} target to follow
   */
  static foxyResponse = {};

  follow(target) {
    return this;
  }

  fetch() {
    return Promise.resolve(MockFoxy.foxyResponse);
  }

  fetchRaw(req) {
    return Promise.resolve({json: () => true, patched: true, cart: req.body});
  }

  static setResponse(dueResponse) {
    MockFoxy.foxyResponse = dueResponse;
  }

  static stdResponse() {
    return {
      _embedded: {
        "fx:carts": []
      }
    };
  }

  static setEmptyCart() {
    MockFoxy.setResponse(MockFoxy.stdResponse());
  }

  static setValidCart() {
    const std = MockFoxy.stdResponse();
    std._embedded['fx:carts'].push(
      {
        addItem: function(i) {
          this._embedded['fx:items'].push(i)
        },
        _embedded: {
          'fx:items': []
        },
        _links: {
          self: {
            href: 'self.href'
          }
        }
      }
    );
    std.getCart = function() {
      return this._embedded['fx:carts'][0];
    };
    MockFoxy.setResponse(std);
  }

  static item() {
    return {
      code: 'foo',
    };
  }

  static subscriptionItem() {
    const item = MockFoxy.item();
    item.subscription_frequency = '1m';
    return item;
  }

}

  app.__set__('FoxyApi', MockFoxy);

chai.use(chaiHttp);
const expect = chai.expect;


function lambdaPath(path) {
  const netlifyLambdaPath = '/.netlify/functions/cart';
  return `${netlifyLambdaPath}${path}`;
}

function setClientId() {
  config.foxy.api.clientId = 'foo';
}

function setConfig() {
  config.foxy.api.clientId = 'foo';
  config.foxy.api.clientSecret = 'foo';
  config.foxy.api.refreshToken= 'foo';
}


describe("Cart", function () {
  let requester;
  beforeEach(
    function() {
      setClientId();
      requester = chai.request(app);
    }
  );

  it("should not answer in the root path", async function() {
    const res = await requester.get(lambdaPath('/'));
    expect(res.statusCode).to.equal(400);
    expect(res.body).to.exist;
    expect(res.body.error).to.equal('true');
    expect(res.body.message).to.equal("Invalid request.");
  });

  it("should inform about configuration error", async function () {
    const res = await requester.get(lambdaPath('/1234/convert/recurring/1m'));
    expect(res.statusCode).to.equal(500);
    expect(res.body).to.match(/FOXY_API_CLIENT_ID is not configured/);
  });

  it("Should report Cart not found when cart is not available", async function () {
    setConfig();
    MockFoxy.setEmptyCart();
    const res = await requester.get(lambdaPath('/111/convert/recurring/1m'));
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.equal("Cart not found.");
  });

  describe("Should convert the cart to subscription", async function () {
    it ("should not change a cart with no items", async function () {
      setConfig();
      MockFoxy.setValidCart();
      const res = await requester.get(lambdaPath('/111/convert/recurring/1m'));
      const expected = MockFoxy.foxyResponse._embedded['fx:carts'][0];
      delete expected.addItem;
      expect(res.body).to.deep.equal(expected);
    });

    it ("should patch items to add subscription info", async function () {
      setConfig();
      MockFoxy.setValidCart();
      const cart = MockFoxy.foxyResponse.getCart();
      cart.addItem(MockFoxy.item());
      const res = await requester.get(lambdaPath('/111/convert/recurring/1m'));
      expect(res.body.patched).to.be.true;
    });

    it ("should add subscription frequency to items", async function () {
      setConfig();
      MockFoxy.setValidCart();
      const cart = MockFoxy.foxyResponse.getCart();
      cart.addItem(MockFoxy.item());
      cart.addItem(MockFoxy.item());
      cart.addItem(MockFoxy.item());
      const res = await requester.get(lambdaPath('/111/convert/recurring/1m'));
      expect(res.body.patched).to.be.true;
      expect(res.body.cart._embedded).to.exist;
      expect(res.body.cart._embedded['fx:items'].every(i => i.subscription_frequency)).to.be.true;
    });

    it ("should not add subscription frequency to old subscriptions", async function () {
      setConfig();
      MockFoxy.setValidCart();
      const cart = MockFoxy.foxyResponse.getCart();
      cart.addItem(MockFoxy.item());
      cart.addItem(MockFoxy.subscriptionItem());
      cart.addItem(MockFoxy.subscriptionItem());
      const res = await requester.get(lambdaPath('/111/convert/recurring/1m'));
      expect(res.body.patched).to.be.true;
      expect(res.body.cart._embedded).to.exist;
      expect(res.body.cart._embedded['fx:items'].length).to.equal(1);
    });

  }); 

  describe("Convert subscription to one off", function () {

    it ("Should warn about misconfiguration", async function () {
      config.foxy.api.clientId = undefined;
      requester = chai.request(app);
      const res = await requester.get(lambdaPath('/111/convert/nonrecurring'));
      expect(res.status).to.equal(500);
      expect(res.body).to.match(/FOXY_API_CLIENT_ID is not configured./);
    });

    it ("Should warn about invalid cart", async function () {
      MockFoxy.setEmptyCart();
      const res = await requester.get(lambdaPath('/111/convert/nonrecurring'));
      expect(res.status).to.equal(404);
      expect(res.body).to.match(/Cart not found\./);
    });

    
    it ("should remove subscription frequency from old subscriptions", async function () {
      setConfig();
      MockFoxy.setValidCart();
      const cart = MockFoxy.foxyResponse.getCart();
      cart.addItem(MockFoxy.subscriptionItem());
      cart.addItem(MockFoxy.subscriptionItem());
      const res = await requester.get(lambdaPath('/111/convert/nonrecurring'));
      expect(res.body.patched).to.be.true;
      expect(res.body.cart._embedded).to.exist;
      expect(res.body.cart._embedded['fx:items'].every(i => !i.subscription_frequency)).to.be.true;
    });


  });

});
