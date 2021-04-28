import { describe, it } from "mocha";
import { DataStore } from "../../../src/functions/shiptheory/DataStore.js";
import chai from "chai";
import * as mockShipTheoryAPI from "./MockShipTheoryAPI.js";
import nock from "nock";

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
    process.env["FOXY_SHIPTHEORY_EMAIL"] = 'foo@example.com';
    process.env["FOXY_SHIPTHEORY_PASSWORD"] = 'password@example.com';
    nock('https://api.shiptheory.com', {
      reqheaders: {
        accept: "application/json",
        "content-type": "application/json",
      }
    })
      .post('/v1/token', body => body.email && body.password)
      .reply(200, {success: true, data: {token: 'token'}});
    const ds = new DataStore();
    await ds.authenticate();
    expect(ds.token).to.exist;
    expect(ds.token).to.equal('token');
  });

});
