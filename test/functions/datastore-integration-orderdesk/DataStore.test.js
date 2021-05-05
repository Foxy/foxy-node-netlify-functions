const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const nock = require("nock");
const { after, beforeEach, describe, it } = require("mocha");
const { DataStore } = require("../../../src/functions/datastore-integration-orderdesk/DataStore.js");
const { MockOrderDesk } = require("./mock/mockOrderDesk.js");
const { config } = require("../../../config.js");

chai.use(chaiAsPromised);
const expect = chai.expect;


const mockOD = new MockOrderDesk();

function setOrderDeskConfig(key, id) {
  config.datastore.provider.orderDesk.apiKey = key;
  config.datastore.provider.orderDesk.storeId = id;
}

function orderDeskFullItem() {
  return  {
    code: 'foo',
    id: 'foo',
    name: 'foo',
    price: 1,
    stock: 1,
  };
}

describe("OrderDesk Datastore", function() {
  setOrderDeskConfig('foo', 'bar');

  beforeEach(
    () => setOrderDeskConfig('foo', 'bar')
  );

  describe("Configuration", function() {

    it ("Should inform about missing configuration.", function () {
      const cases = [
        ['foo', undefined],
        [undefined, 'foo'],
        [undefined, undefined],
      ];
      for (let c of cases) {
        setOrderDeskConfig(...c);
        expect(() => new DataStore()).to.throw(Error, /Environment variables for OrderDesk store id and\/or API key are missing./)
      }
    });

    it ("Should be configurable using order desk keys", function () {
      const odClient = new DataStore();
      expect(odClient.credentials).to.deep.equal( { id: 'bar', key: 'foo' });
    });

  });

  describe("Fetch OrderDesk items", function() {
    it ("Should fetch items from OrderDesk", async function () {
      const odClient = new DataStore(
        process.env['FOXY_ORDERDESK_STORE_ID'],
        process.env['FOXY_ORDERDESK_API_KEY']
      );
      mockInventoryItems(odClient);
      const result = await odClient.fetchInventoryItems(['lollipop', 'candy', 'bubblegum']);
      expect(result).to.exist;
      expect(result.length).to.equal(3);
    });
  });

  describe("Update OrderDesk items", function() {

    describe("Does not update to invalid states", function () {
      config.datastore.skipUpdate.inventory = '__NONE__';
      const odClient = new DataStore();
      const fullItem = orderDeskFullItem();
      for (let k of Object.keys(fullItem)) {
        const lacking = {...fullItem};
        lacking[k] = undefined;
        it (`Cannot update items with ${k} missing.`, async function () {
          await expect(odClient.updateInventoryItems([lacking])).to.be.rejectedWith(Error, /Invalid inventory items for update/);
        });
      }
    });

    describe("Sends an appropriate PUT request", async function () {
      config.datastore.skipUpdate.inventory = '__NONE__';
      const odClient = new DataStore();
      const fullItem = orderDeskFullItem();
      it ("Returns the body of the response", async function() {
        mockBatchInventoryItems(odClient);
        const response = await odClient.updateInventoryItems([fullItem]);
        expect(response.status).to.equal('success');
      });
    });


  });


  describe("Should validate OrderDesk items.", async function() {
    const requiredFields = ['id', 'name', 'code', 'price', 'stock'];
    const requiredZeroableFields = ['price', 'stock'];
    const fullItem = {
      code: 1,
      id:1,
      name: 'foo',
      price: 1,
      stock: 1
    };
    const odClient = new DataStore();
    for (let req of requiredFields) {
      await it (`Should reject items without ${req}`, function () {
        const lackingitem = {...fullItem};
        lackingitem[req] = undefined;
        expect(odClient.validateInventoryItem(lackingitem)).to.be.false;
      });
    }
    for (let req of requiredZeroableFields) {
      const lackingitem = {...fullItem};
      lackingitem[req] = undefined;
      it (`Should reject items without ${req}`, function () {
        expect(odClient.validateInventoryItem(lackingitem)).to.be.false;
      });
      it (`Should accept ${req} with value zero`, function () {
        lackingitem[req] = 0;
        expect(odClient.validateInventoryItem(lackingitem)).to.be.true;
      });
    }

    it ("Should accept items with id, name, code, price and stock.", function () {
      const odClient = new DataStore();
      expect(
        odClient.validateInventoryItem(
          {
            code: 1,
            id:1,
            name: 'foo',
            price: 1,
            stock: 1,
          })).to.be.true;
    });

  });

  it ("Should convert order desk items to canonical items", function () {
    const odClient = new DataStore();
    const cases = [
      [{}, {name: undefined, price: undefined, inventory: undefined, code: undefined, update_source: 'Foxy-OrderDesk-Webhook'}],
      [{name: 'foo', price: 0, stock: 1, code: '1'}, {name: 'foo', price: 0, inventory: 1, code: '1', update_source: 'Foxy-OrderDesk-Webhook'}],
      [{price: 0, code: '1'}, {name: undefined, price: 0, inventory: undefined, code: '1', update_source: 'Foxy-OrderDesk-Webhook'}],
    ];
    for (let c of cases) {
      expect(odClient.convertToCanonical(c[0]))
        .to.deep.equal(c[1]);
    }
  });
});

function mockInventoryItems(dataStore) {
  const mock = new MockOrderDesk();
  const response = mock.fetch('inventory-items')
  nock('https://' + dataStore.domain)
    .defaultReplyHeaders(response.headers)
    .get('/api/v2/inventory-items')
    .query(true)
    .reply(200, response.body);
}

function mockBatchInventoryItems(dataStore) {
  const mock = new MockOrderDesk();
  const response = mock.fetch('batch-inventory-items')
  nock('https://' + dataStore.domain, {
    reqheaders: {
      'ORDERDESK-API-KEY': 'foo',
      'ORDERDESK-STORE-ID': 'bar'
    }
  })
    .defaultReplyHeaders(response.headers)
    .put('/api/v2/batch-inventory-items')
    .reply(200, (path, items) => {
      it("should contain propper items", function() {
        expect(items).to.be.an('Array');
        expect(items.every(i => i.id && i.name && i.price && i.stock && i.update_source)).to.be.true;
      });
      return response.body
    });
}
