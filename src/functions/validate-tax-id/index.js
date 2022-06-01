const fetch = require("node-fetch");
const { config } = require("../../../config.js");

/**
 * Receives the request, validates the VAT ID and sends the response.
 *
 * @param {Object} requestEvent the request event built by Netlify Functions
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */
async function handler(requestEvent) {
  try {
    const cartDetails = JSON.parse(requestEvent.body);
    const vatNumber = cartDetails["_embedded"]["fx:customer"]["tax_id"];

    const vatlayer_access_key = config.vatlayer.accessKey;

    if (vatNumber !== "") {
      const response = await fetch(
        `http://apilayer.net/api/validate?access_key=${vatlayer_access_key}&vat_number=${vatNumber}`
      );
      const data = await response.json();

      if (data.valid === true) {
        console.log("VAT ID is valid", data);
        return {
          body: JSON.stringify({ details: "VAT ID is valid", ok: true }),
          statusCode: 200,
        };
      } else if (data.valid === false) {
        console.log("VAT ID is not valid", data);
        return {
          body: JSON.stringify({
            details:
              "Your VAT ID does not appear to be valid. Please review your VAT ID and try again.",
            ok: false,
          }),
          statusCode: 200,
        };
      } else {
        console.error("Error:", data.error.info);
        return {
          body: JSON.stringify({
            details: "An internal error has occurred when validating VAT ID",
            ok: false,
          }),
          statusCode: 200,
        };
      }
    } else {
      console.log("No VAT ID is provided");
      return {
        body: JSON.stringify({ details: "No VAT ID is provided", ok: true }),
        statusCode: 200,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      body: JSON.stringify({
        details: "An internal error has occurred when validating VAT ID",
        ok: false,
      }),
      statusCode: 500,
    };
  }
}

module.exports = {
  handler,
};
