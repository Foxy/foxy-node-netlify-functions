const fetch = require('node-fetch');
const { describe, it, beforeEach } = require("mocha");
const rewire = require('rewire');
const DataStore = rewire("./DataStore.js");
const { expect } = require("chai");
const MockOrderDesk = require("../datastore-integrations/orderdesk/mockOrderDesk.js");

const mockOD = new MockOrderDesk();
DataStore.__set__('fetch', mockOD.fetch);

describe("OrderDesk Client", function() {


  it ("Should fetch items from OrderDesk", async function () {
    const odClient = new DataStore(
      process.env['FOXY_ORDERDESK_STORE_ID'],
      process.env['FOXY_ORDERDESK_API_KEY']
    );
    const result = await odClient.fetchInventoryItems(['lollipop', 'candy', 'bubblegum']);
    expect(result).to.exist;
    expect(result.length).to.equal(3);
  });

  it ("Should convert order desk items to canonical items", function () {
    const odClient = new DataStore();
    const cases = [
      [{}, {name: undefined, price: undefined, inventory: undefined, code: undefined}],
      [{name: 'foo', price: 0, stock: 1, code: '1'}, {name: 'foo', price: 0, inventory: 1, code: '1'}],
      [{price: 0, code: '1'}, {name: undefined, price: 0, inventory: undefined, code: '1'}],
    ];
    for (let c of cases) {
      expect(odClient.convertToCanonical(c[0]))
        .to.deep.equal(c[1]);
    }
  });
});

