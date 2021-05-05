const MockFoxyRequest = require("../../../MockFoxyRequests.js");


function randomString() {
  return Math.random().toString(36)
    .replace(/[^a-z]+/g, '').substr(0, 5);
}

function basicRequest(itemBuilder, qty = 10) {
  return {
    _embedded: {
      'fx:items': [...new Array(qty)].map(itemBuilder),
    },
    _links: {
    },
    locale_code: 'en_US',
    total_item_price: 35.99,
    total_order: 49.86,
    total_tax: 3.24,
  };
}

function basicItem() {
  return {
    _embedded: {
      'fx:item_category': {
        code: 'DEFAULT',
      },
      'fx:item_options': [
        {
          name: 'collection_id',
          value: 'COLLECTIONID',
        },
      ],
    },
    code: `code${randomString()}`,
    name: randomString(),
    price: 11,
    quantity: 1,
  };
}

function basicSubscription(item) {
  const emptySubscription = {
    subscription_end_date: null,
    subscription_frequency: '',
    subscription_next_transaction_date: null,
    subscription_start_date: null,
  };
  return { ...item, ...emptySubscription };
}

function subscriptionItem() {
  return basicSubscription(basicItem());
}

function foxyRequest(changes, itemBuilder = basicItem) {
  function functionToSet(key, value) {
    return (el) => {
      const toChange = el;
      toChange[key] = value;
      return toChange;
    };
  }

  /** Set the a value for all items in a collection */
  function setItemsValue(items, key, value) {
    items.forEach(functionToSet(key, value));
  }

  function setItemsOption(items, option, optionValue) {
    for (let i of items) {
      if (!i._embedded) {
        i._embedded = {};
      }
      if (!i._embedded['fx:item_options']) {
        i._embedded['fx:item_options'] = [];
      }
      const existing = i._embedded['fx:item_options'].find(i=>i.name === option);
      if (existing) {
        existing.value = optionValue;
      } else {
        i._embedded['fx:item_options'].push({name: option, value: optionValue});
      }
    }
  }

  /** Set several values for all items in a collection */
  function setItemsValuesAll(items, changes) {
    for (let [k, v] of Object.entries(changes)) {
      if (k === 'options' && typeof v === 'object') {
        for (const [option, optionValue] of Object.entries(v)) {
          setItemsOption(items, option, optionValue);
        }
      } else {
        setItemsValue(items, k, v);
      }
    }
  }

  const items = basicRequest(itemBuilder);
  if (Array.isArray(changes) && changes.length === 2) {
    setItemsValue(items._embedded['fx:items'], changes[0], changes[1]);
  } else if (typeof changes === 'object') {
    setItemsValuesAll(items._embedded['fx:items'], changes);
  }
  return MockFoxyRequest.validRequest(items);
}

const itemBuilders = {
  subscriptionItem,
};

const basic = function () {
  return basicRequest(basicItem);
};

const longCollection = function () {
  return basicRequest(basicItem, 100);
};

module.exports = {
  basic,
  itemBuilders,
  longCollection,
  foxyRequest
}
