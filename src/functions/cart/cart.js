import * as FoxySDK from "@foxy.io/sdk";
import * as dotenv from "dotenv";
import bodyParser from "body-parser";
import { config } from '../../../config.js';
import createError from "http-errors";
import express from "express";
import serverless from "serverless-http";


const app = express();

dotenv.config();

const messageCartNotFound = 'Cart not found.';

/**
 * Validate configuration requirements
 *
 * @returns {boolean} the configuration is valid
 */
function validateConfig() {
  return !!(config.foxy.api.clientId &&
    config.foxy.api.clientSecret &&
    config.foxy.api.refreshToken)
  ;
}

/**
 * Validate the cart has the proper attributes.
 *
 * @param {Object} cart to be validated.
 * @returns {boolean} the cart attributes are valid.
 */
function validateCart(cart) {
  if (!cart) {
    return false;
  } else {
    return !(!cart._embedded || !Array.isArray(cart._embedded["fx:items"]));
  }
}

/**
 * Initialize Foxy API
 *
 * @param {Object} app to be assigned a Foxy Backend API.
 * @returns {Object} foxy api instance
 */
function setFoxyAPI(app) {
  if (!app.foxy) {
    if (validateConfig()) {
      app.foxy = new FoxySDK.Backend.API(
        {
          clientId: config.foxy.api.clientId,
          clientSecret: config.foxy.api.clientSecret,
          refreshToken: config.foxy.api.refreshToken,
        }
      );
    }
  }
  return app.foxy;
}

/** Functions and Variables */
/** Default values */
const defaultSubFrequency = config.default.autoshipFrequency || "1m";

/**
 * @typedef {import(@foxy/sdk).Backend.API} API
 */

/**
 * Retrieves a `cart` resource by ID.
 *
 * @param {Object} foxy API instance to use.
 * @param {number} id - The ID of the cart to retrieve.
 * @returns {Object} first cart.
 */
const getCart = async (foxy, id) => {
  if (!id && !Number.isInteger(id)) {
    return {};
  }
  let carts;
  try {
    carts = await foxy
      .follow("fx:store")
      .follow("fx:carts")
      .get({
        query: { id },
        zoom: [
          "items",
          "items:item_options",
          "items:item_options:discount_details",
        ],
      });
  } catch(e) {
    throw new Error("Error getting cart.");
  }
  return carts._embedded["fx:carts"][0] || {};
};

/**
 * Updates the cart and its contents
 *
 * @param {Object} cart with modifications to be.
 * @returns {Promise} that resolves to the api response.
 */
const patchCart = async (cart) => {
  return cart.patch({
    body: cart,
    zoom: [
      "items",
      "items:item_options",
      "items:item_options:discount_details",
    ],
  });
};

/**
 * Strips all `sub_` parameters from all cart items.
 *
 * @param {number} id
 * @param {Object} cart
 */
const convertCartToOneOff = async (id, cart) => {
  // Remove any non-subscription products, as we don't need to modify them.
  const cartOriginal = JSON.parse(JSON.stringify(cart));
  cart._embedded["fx:items"] = cart._embedded["fx:items"].filter(
    (item) => item.subscription_frequency
  );
  for (const item of cart._embedded["fx:items"]) {
    item.subscription_frequency = "";
    item.subscription_start_date = null;
    item.subscription_end_date = null;
    item.subscription_next_transaction_date = null;
  }
  if (cart._embedded["fx:items"].length > 0) {
    return patchCart(cart);
  } else {
    return cartOriginal;
  }
};

/**
 * Converts a cart into a subscription
 *
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
  cart._embedded["fx:items"] = cart._embedded["fx:items"]
    .filter(item => !item.subscription_frequency)
    .map(item => {
      item.subscription_frequency = frequency;
      return item
    });
  if (cart._embedded["fx:items"].length > 0) {
    return patchCart(cart);
  } else {
    return cartOriginal;
  }
};

/** Express Routing */

const cartRouter = express.Router();

cartRouter.get("/", (req, res) => {
  res.status(400).json({ error: "true", message: "Invalid request." });
});

// TODO: Make it POST
cartRouter.get(
  "/:cartId(\\d+)/convert/recurring/:frequency",
  async (req, res) => {
    let err;
    if (!validateConfig()) {
      res.status(500).json("FOXY_API_CLIENT_ID is not configured;");
    } else {
      setFoxyAPI(app);
      if (app.foxy) {
        try {
          const cart = await getCart(app.foxy, req.params.cartId);
          if (!validateCart(cart)) {
            throw createError(404, messageCartNotFound);
          }
          res.json(await convertCartToSubscription(
            req.params.cartId,
            cart,
            req.params.frequency
          ));
          return;
        } catch(e) {
          err = e;
          if (err.message === 'Error getting cart.') {
            err.status = 404;
            err.message = "Cart not found.";
          }
          console.log("Error: ", err.code, err.message);
        }
      }
      if (err.status) {
        res.status(err.status).json(err.message);
      } else {
        res.status(500).json("Error fetching or modifying cart.");
      }
    }
  }
);

// TODO: Make it POST
cartRouter.get(
  "/:cartId(\\d+)/convert/nonrecurring",
  async (req, res) => {
    if (!validateConfig()) {
      res.status(500).json("FOXY_API_CLIENT_ID is not configured.");
    } else {
      setFoxyAPI(app);
      try {
        const cart = await getCart(app.foxy, req.params.cartId);
        if (!validateCart(cart)) {
          throw createError(404, messageCartNotFound);
        }
        const data = convertCartToOneOff(req.params.cartId, cart);
        res.json(data);
      } catch(err) {
        if (err.status) {
          res.status(err.status).json(err.message);
        } else {
          res.status(500).json("Error fetching or modifying cart.");
        }
      }
    }
  }
);

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
      message: "Invalid origin header.",
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
    message: "Unknown error.",
  });
});

export const handler = serverless(app);
export { app }
