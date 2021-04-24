const { after, afterEach, before, beforeEach, describe, it } = require("mocha");
const {expect} = require("chai");
const rewire = require("rewire");
const DataStore = rewire("../../../src/functions/shiptheory/DataStore.js");
const mockShipTheoryAPI = require("./MockShipTheoryAPI");




describe("ShipTheory Client", function() {
  let restore;
  before(
    function() {
      restore = DataStore.__set__('fetch', mockShipTheoryAPI.fetch);
    }
  );

  after(
    function() {
      restore();
    }
  );

  it ("Should be configured usig environment variables.", function() {
    const ds = new DataStore();
    process.env["FOXY_SHIPTHEORY_EMAIL"] = 'email';
    process.env["FOXY_SHIPTHEORY_PASSWORD"] = 'password';
    ds.setCredentials();
    expect(ds.credentials).to.exist;
    expect(ds.credentials).to.deep.equal({email:'email', password:'password'});
  });

  it ("Should always add Accept and Content-Type to headers", function() {
    const ds = new DataStore();
    const defaultHeader = ds.getDefaultHeader();
    expect(defaultHeader.Accept).to.exist;
    expect(defaultHeader['Content-Type']).to.exist;
    expect(defaultHeader.Accept).to.equal('application/json');
  });

  it ("Should authenticate in ShipTheory", async function() {
    const ds = new DataStore();
    const result = await ds.authenticate();
    expect(ds.token).to.exist;
    expect(ds.token).to.equal('token');;
  });

  


});
