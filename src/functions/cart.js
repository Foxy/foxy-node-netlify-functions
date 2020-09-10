require("dotenv").config();
const traverse = require("traverse");
const { FoxyApi } = require("@foxy.io/node-api");
const foxy = new FoxyApi();
const store = foxy.follow("fx:store");

const createError = require("http-errors");
const express = require("express");
const serverless = require("serverless-http");
const app = express();
const bodyParser = require("body-parser");


/** Functions and Variables */
/** Default values */
const defaultSubFrequency = process.env.DEFAULT_FREQUENCY
  ? process.env.DEFAULT_FREQUENCY
  : "1m";


/**
 * Retrieves a `cart` resource by ID.
 * @param {number} id - The ID of the cart to retrieve.
 */
const getCart = async (id) => {
  if (!id && !Number.isInteger(id)) {
    console.log("id?:", id)
    return {};
  }
  const carts = await store.follow("fx:carts").fetch({
    query: {
      id: id
    },
    zoom: ["items", "items:item_options", "items:item_options:discount_details"]
  })
    .catch(e => {
      return Promise.reject("Error getting cart.");
    });
  return carts._embedded["fx:carts"][0] || {};
}


/**
 * Updates the cart and its contents
 * @param {number} id
 * @param {Object} cart
 */
const patchCart = async (id, cart) => {
  return foxy.fetchRaw({
    url: cart._links.self.href,
    method: "PATCH",
    zoom: ["items", "items:item_options", "items:item_options:discount_details"],
    body: cart
  })
    .catch((e) => {
      console.log("cartRef.fetch failed:", e);
      return Promise.reject("Patching cart failed.");
    });
}


/**
 * Strips all `sub_` parameters from all cart items.
 * @param {number} id
 * @param {Object} cart
 */
const convertCartToOneOff = async (id, cart) => {
  // Remove any non-subscription products, as we don't need to modify them.
  const cartOriginal = JSON.parse(JSON.stringify(cart));
  cart._embedded["fx:items"] = cart._embedded["fx:items"].filter(
    (item) => item.subscription_frequency
  );

  for (let i = 0; i < cart._embedded["fx:items"].length; i++) {
    cart._embedded["fx:items"][i].subscription_frequency = "";
    cart._embedded["fx:items"][i].subscription_start_date = null;
    cart._embedded["fx:items"][i].subscription_end_date = null;
    cart._embedded["fx:items"][i].subscription_next_transaction_date = null;
  }

  if (cart._embedded["fx:items"].length > 0) {
    console.log("Patching…");
    return patchCart(id, cart)
      .catch((e) => {
        return Promise.reject("ERROR patching cart.");
      });
  } else {
    console.log("All products are already one-offs.");
    return cartOriginal;
  }
}

/**
 * Converts
 * @param {number} id
 * @param {Object} cart
 * @param {string} frequency
 * @param {string[]} allowList
 * @param {string[]} ignoreList
 */
const convertCartToSubscription = async (
  id,
  cart,
  frequency = defaultSubFrequency,
  allowList,
  ignoreList
) => {
  // Remove any existing subscription items in the cart, as we don't need to modify them
  const cartOriginal = JSON.parse(JSON.stringify(cart));
  cart._embedded["fx:items"] = cart._embedded["fx:items"].filter(
    (item) => !item.subscription_frequency
  );

  for (let i = 0; i < cart._embedded["fx:items"].length; i++) {
    cart._embedded["fx:items"][i].subscription_frequency = frequency;
  }

  if (cart._embedded["fx:items"].length > 0) {
    console.log("Patching…");
    return patchCart(id, cart).catch(e => {
      return Promise.reject("ERROR patching cart.");
    })
  } else {
    console.log("All products are already subscriptions.");
    return cartOriginal;
  }
};



/** Express Routing */

const cartRouter = express.Router();

cartRouter.get("/", (req, res) => {
  res.status(400).json({ error: "true", message: "Invalid request." });
});

// TODO: Make it POST
cartRouter.get("/:cartId(\\d+)/convert/recurring/:frequency", async (req, res, next) => {
  if (!req.params.cartId) {
    throw createError(400, `cartId not found.`);
  }
  await getCart(req.params.cartId)
    .then(async (cart) => {
      return convertCartToSubscription(
        req.params.cartId,
        cart,
        req.params.frequency
      );
    })
    .then((data) => res.json(data))
    .catch((err) => {
      console.log("ERROR in getCart:", err);
      throw createError(500, "Error fetching or modifying cart.");
    });
});

// TODO: Make it POST
cartRouter.get("/:cartId(\\d+)/convert/nonrecurring", async (req, res, next) => {
  if (!req.params.cartId) {
    throw createError(400, `cartId not found.`);
  }
  await getCart(req.params.cartId)
    .then(async (cart) => {
      return convertCartToOneOff(req.params.cartId, cart);
    })
    .then((data) => res.json(data))
    .catch((err) => {
      console.log("ERROR in getCart:", err);
      throw createError(500, "Error fetching or modifying cart.");
    });
});


app.use(bodyParser.json());

// Override the `res.json` to tweak and sanitize the data a bit.
// TODO: Enable this once the FoxyAPI.sanitize.removePrivateAttributes method is fixed.
// app.use((req, res, next) => {
//   const { json } = res;
//   res.json = function modifyPortalResponseJson(obj) {
//     console.log("MODIFY RESPONSE?");
//     console.log(JSON.stringify(obj));
//     const transformedResponse = traverse(obj).map(
//       FoxyApi.sanitize.all(
//         FoxyApi.sanitize.removePrivateAttributes,
//         FoxyApi.sanitize.removeProperties("third_party_id")
//       )
//     );
//     json.call(this, transformedResponse);
//   };
//   next();
// });

app.use("/.netlify/functions/cart", cartRouter); // path must route to lambda




// CORS error
app.use((err, req, res, next) => {
  if (err.message && err.message === "CORS_ERROR") {
    res.status(401).json({
      type: "cors",
      code: "401",
      message: "Invalid origin header."
    });
  } else {
    next();
  }
});

// Unknown Error Handler
// Without the `next` this barfs the whole stack trace, and says res.status isn't defined?
// Probably need to improve this.
app.use((err, req, res, next) => {
  console.error("Final error:", err);
  res.status(502).json({
    type: "unknown",
    code: "0",
    message: "Unknown error."
  });
});

module.exports = app;
module.exports.handler = serverless(app);
