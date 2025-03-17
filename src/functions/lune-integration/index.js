const fetch = require("node-fetch");
const { config } = require("../../../config.js");

/**
 * Receives the request, gets the lune estimate ID for the selected shipping rate, and creates and order on lune.
 *
 * @param {Object} requestEvent the request event built by Netlify Functions
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */
async function handler(requestEvent) {
  try {
    const cartDetails = JSON.parse(requestEvent.body);
    const ratePrefix = "rate_id_";
    const selectedShippingRateID =
      cartDetails["_embedded"]["fx:shipments"][0].shipping_service_id;
    const luneEstimateID = cartDetails["_embedded"]["fx:attributes"].find(
      (attr) => attr.name === `${ratePrefix}${selectedShippingRateID}`
    ).value;

    const LUNE_API_KEY = config.lune.apiKey;

    if (!luneEstimateID) {
      console.log("No lune CO2 estimate ID is provided");
      return {
        body: JSON.stringify({
          details: "No lune CO2 estimate ID is provided",
          ok: true,
        }),
        statusCode: 200,
      };
    }

    const orderByEstimateIdUrl = "https://api.lune.co/v1/orders/by-estimate";
    const response = await fetch(orderByEstimateIdUrl, {
      body: JSON.stringify({
        estimate_id: luneEstimateID,
        metadata: {
          customer_email: cartDetails.customer_email,
          transaction_id: String(cartDetails.id),
        },
      }),
      headers: {
        Authorization: `Bearer ${LUNE_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = await response.json();

    if (data.id) {
      console.log("Order created successfully", data);
      return {
        body: JSON.stringify({
          details: `Order ${data.id} created successfully on lune`,
          ok: true,
        }),
        statusCode: 200,
      };
    } else {
      console.error("Error:", data);
      return {
        body: JSON.stringify({
          details:
            "An internal error has occurred when creating a lune order based on the CO2 estimate ID",
          ok: false,
        }),
        statusCode: 200,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      body: JSON.stringify({
        details:
          "An internal error has occurred when creating a lune order based on the CO2 estimate ID",
        ok: false,
      }),
      statusCode: 500,
    };
  }
}

module.exports = {
  handler,
};
