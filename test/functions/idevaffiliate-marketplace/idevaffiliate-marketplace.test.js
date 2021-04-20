const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const {expect} = require("chai");
const rewire = require("rewire");


const chaiHttp = require('chai-http');
const handler = rewire('../../../src/functions/idevaffiliate-marketplace/idevaffiliate-marketplace.js');
const config = handler.__get__('config');



function setConfig() {
}

describe("Idev Affiliate", function() {

  before(
    function () {
      config.foxy.api.clientId = 'foo';
    }
  );

  it ("Should require Foxy Client Id", async function () {
    expect(async () => {await handler({})}).to.throw;
  });


});
