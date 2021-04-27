import { after, before, describe, it } from "mocha";
import { DataStore } from "../../../src/functions/shiptheory/DataStore.js";
import chai from "chai";
import * as mockShipTheoryAPI from "./MockShipTheoryAPI.js";

const expect = chai.expect;

describe("ShipTheory Client", function() {

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
    await ds.authenticate();
    expect(ds.token).to.exist;
    expect(ds.token).to.equal('token');
  });

});
