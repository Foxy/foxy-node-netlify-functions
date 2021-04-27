import * as handler from "../../../src/functions/shiptheory/index.js";
import { afterEach, beforeEach, describe, it } from "mocha";
import chai from "chai";
import sinon from "sinon"; 

const expect = chai.expect;

describe("Shiptheory", function() {

  describe("Validation", function() {
    describe ("Should warn about invalid configuration", async function () {
      let stub;
      beforeEach(
        function () {
          stub = sinon.stub(console, "error");
        }
      );
      afterEach(
        function () {
          stub.restore();
        }
      );
      const requiredVariables = {
        "FOXY_SHIPTHEORY_EMAIL": "example@example.com",
        "FOXY_SHIPTHEORY_PASSWORD": "foobar",
        "FOXY_WEBHOOK_ENCRYPTION_KEY": "12341234"
      };
      for (let k of Object.keys(requiredVariables)) {
        const missingOne = {...requiredVariables};
        delete missingOne[k];
        process.env = missingOne;
        it ("Should detect invalid " + k, async function() {
          await handler.handler({});
          stub.calledWithMatch(k);
        });
      }
    });
  });


  describe("Authentication", function() {
  });


});
