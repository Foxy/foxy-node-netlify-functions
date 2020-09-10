require("dotenv").config();
const { FoxyApi } = require("@foxy.io/node-api");
const foxy = new FoxyApi();
const store = foxy.follow("fx:store");

/** Default values */
const defaultSubFrequency = process.env.DEFAULT_FREQUENCY
  ? process.env.DEFAULT_FREQUENCY
  : "1m";

/**
 * Error response helper.
 * @param {number} code
 * @param {string} message
 */
const errorResponse = (code = 400, message = "") => {
  return {
    statusCode: code,
    body: JSON.stringify({
      message,
    }),
  };
};


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
  // const cartRef = store.follow("fx:carts").follow(id);
  // return cartRef
  //   .fetch({
  //     method: "PATCH",
  //     body: cart,
  //   })
  // console.log("To PATCH:", JSON.stringify(cart));
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
const convertCartToOneOff = async (id, cart) => { }

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
  console.log(frequency);
  // Remove any existing subscription items in the cart
  cart._embedded["fx:items"] = cart._embedded["fx:items"].filter(
    (item) => !item.subscription_frequency
  );

  for (let i = 0; i < cart._embedded["fx:items"].length; i++) {
    cart._embedded["fx:items"][i].subscription_frequency = frequency;
  }

  if (cart._embedded["fx:items"].length > 0) {
    console.log("Patching…");
    console.log(JSON.stringify(cart._embedded["fx:items"]));
    return patchCart(id, cart).catch(e => {
      return Promise.reject("ERROR patching cart.");
    })
  } else {
    console.log("All products are already subscriptions.");
    return true;
  }
};


exports.handler = async (event, context) => {
  const cartId = parseInt(event.queryStringParameters.cartId);
  console.log(cartId);
  if (!cartId) {
    return errorResponse(400, "No cartId passed.");
  }
  if (!Number.isInteger(cartId) || cartId > 100000000000) {
    return errorResponse(400, "Passed cartId is not valid.");
  }

  // let foo = await store.fetch();
  let cart = await getCart(cartId).catch((e) => {
    console.log("ERROR in getCart:", e);
  });
  await convertCartToSubscription(cartId, cart, "1m").catch((e) => {
    console.log("ERROR in convertCartToSubscription:", e);
  });


  return {
    statusCode: 200,
    body: JSON.stringify(cartId),
  };
};
