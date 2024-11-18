const fetch = require("node-fetch");
const { config } = require("../../../config.js");

/**
 * Receives the request, validates the price and inventory in Wix and sends the response.
 *
 * @param {Object} requestEvent the request event built by Netlify Functions
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */
async function handler(requestEvent) {
  const cart = JSON.parse(requestEvent.body);

  console.log(`Starting up for transaction ${cart.id}`);

  const items = cart["_embedded"]["fx:items"];
  const mismatchedPrice = [];
  const insufficientInventory = [];

  try {
    for (const item of items) {
      const slug = item["_embedded"]["fx:item_options"].find(
        (option) => option.name.toLowerCase() === "slug"
      )?.value;
      if (!slug) {
        const details = `Cannot find slug in item options for item ${item.name}`;
        console.error(details);
        return {
          body: JSON.stringify({
            details,
            ok: false,
          }),
          statusCode: 200,
        };
      }

      const wixCreds = config.datastore.provider.wix;
      const res = await fetch(
        "https://www.wixapis.com/stores-reader/v1/products/query",
        {
          body: JSON.stringify({
            includeVariants: true,
            query: {
              filter: JSON.stringify({ slug }),
            },
          }),
          headers: {
            Authorization: wixCreds.apiKey,
            "Content-Type": "application/json",
            "wix-account-id": wixCreds.accountId,
            "wix-site-id": wixCreds.siteId,
          },
          method: "POST",
        }
      );
      const data = await res.json();

      if (data.totalResults !== 1) {
        const details = `Cannot find product in Wix by slug ${slug}`;
        console.error(details);
        return {
          body: JSON.stringify({
            details,
            ok: false,
          }),
          statusCode: 200,
        };
      }

      const product = data.products[0];
      const variant = product.variants.find(
        (variant) => variant.variant.sku === item.code
      );

      if (!variant) {
        const details = `Cannot find variant by sku ${item.code}`;
        console.error(details);
        return {
          body: JSON.stringify({
            details,
            ok: false,
          }),
          statusCode: 200,
        };
      }

      const skipPriceCodes =
        (config.datastore.skipValidation.price || "")
          .split(",")
          .map((code) => code.trim())
          .filter((code) => !!code) || [];
      const skipInventoryCodes =
        (config.datastore.skipValidation.inventory || "")
          .split(",")
          .map((code) => code.trim())
          .filter((code) => !!code) || [];

      if (!skipPriceCodes.includes(item.code)) {
        const price = variant.variant.priceData.discountedPrice;
        if (price !== item.price) {
          mismatchedPrice.push(item.code);
        }
      }

      if (!skipInventoryCodes.includes(item.code)) {
        const stock = variant.stock;
        if (stock.trackQuantity) {
          if (stock.quantity < item.quantity) {
            insufficientInventory.push(item.code);
          }
        } else {
          if (!stock.inStock) {
            insufficientInventory.push(item.code);
          }
        }
      }
    }

    if (mismatchedPrice.length > 0 || insufficientInventory.length > 0) {
      console.error({ insufficientInventory, mismatchedPrice });
      return {
        body: JSON.stringify({
          details:
            (insufficientInventory.length > 0
              ? `Insufficient inventory for these items: ${insufficientInventory}. `
              : "") +
            (mismatchedPrice.length > 0
              ? `Price does not match for these items: ${mismatchedPrice}.`
              : ""),
          ok: false,
        }),
        statusCode: 200,
      };
    } else {
      console.log("All checks have passed");
      return {
        body: JSON.stringify({
          details: "",
          ok: true,
        }),
        statusCode: 200,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      body: JSON.stringify({
        details: "An internal error has occurred",
        ok: false,
      }),
      statusCode: 500,
    };
  }
}

module.exports = {
  handler,
};
