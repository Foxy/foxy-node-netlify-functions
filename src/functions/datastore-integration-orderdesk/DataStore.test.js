const MockOrderDesk = require("./mock/mockOrderDesk.js");
const chai = require("chai");
const rewire = require('rewire');
const { describe, it, beforeEach } = require("mocha");
chai.use(require('chai-as-promised'))
const expect = chai.expect;

const DataStore = rewire("./DataStore.js");
const config = DataStore.__get__("config");

const mockOD = new MockOrderDesk();
DataStore.__set__('fetch', mockOD.fetch);


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

    it ("Should be configurable using default datastore credentials", function () {
      setOrderDeskConfig(undefined, undefined);
      config.datastore.credentials = 'Store ID 11111 API Key foobar';
      const odClient = new DataStore();
      expect(odClient.credentials).to.deep.equal(
        {
          id: '11111',
          key: 'foobar'
        }
      );
    });

  });

  describe("Fetch OrderDesk items", function() {
    it ("Should fetch items from OrderDesk", async function () {
      const odClient = new DataStore(
        process.env['FOXY_ORDERDESK_STORE_ID'],
        process.env['FOXY_ORDERDESK_API_KEY']
      );
      const result = await odClient.fetchInventoryItems(['lollipop', 'candy', 'bubblegum']);
      expect(result).to.exist;
      expect(result.length).to.equal(3);
    });
  });

  describe("Update OrderDesk items", function() {

    describe("Does not update to invalid states", function () {
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
      const odClient = new DataStore();
      const fullItem = orderDeskFullItem();
      const prevfetch = DataStore.__get__('fetch');
      DataStore.__set__('fetch', function (url, req) {
        it ("Puts to batch-inventory-items endpoint", function() {
          expect(url).to.match(/batch-inventory-items/);
        });
        it ("Adds OrderDesk required headers", function() {
          expect(req.headers['ORDERDESK-API-KEY']).to.equal('foo');
          expect(req.headers['ORDERDESK-STORE-ID']).to.equal('bar');
        });
        it("Provides all fields to the update endpoint", function () {
          const itemsSent = JSON.parse(req.body);
          itemsSent.every(i => i.id && i.name && i.price && i.stock && i.update_source);
        });
        return prevfetch(url, req);
      });
      it ("Returns the body of the response", async function() {
        const response = await odClient.updateInventoryItems([fullItem]);
        expect(response.status).to.equal('success');
      });
      DataStore.__set__('fetch', prevfetch);
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

