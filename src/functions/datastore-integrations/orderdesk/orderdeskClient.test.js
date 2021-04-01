const fetch = require('node-fetch');
const { describe, it, beforeEach } = require("mocha");
const rewire = require('rewire');
const OrderDeskClient = rewire("./orderdeskClient.js");
const { expect } = require("chai");
const MockOrderDesk = require("./mockOrderDesk.js");

const mockOD = new MockOrderDesk();
OrderDeskClient.__set__('fetch', mockOD.fetch);

describe("description", function() {


  it ("Should fetch items from OrderDesk", async function () {
    const odClient = new OrderDeskClient(
      process.env['ORDERDESK_STORE_ID'],
      process.env['ORDERDESK_API_KEY']
    );
    const result = await odClient.fetchInventoryItems(['lollipop', 'candy', 'bubblegum']);
    expect(result.inventory_items).to.exist;
    expect(result.inventory_items.length).to.equal(3);

  });

});

