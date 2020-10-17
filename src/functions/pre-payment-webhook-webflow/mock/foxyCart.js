function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}

function basicRequest(itemBuilder, qty = 10) {
  return {
    _links: {
    },
    _embedded: {
      'fx:items': [...new Array(qty)].map(itemBuilder),
    },
    locale_code: 'en_US',
    total_item_price: 35.99,
    total_tax: 3.24,
    total_order: 49.86,
  };
}

function basicItem() {
  return {
    name: randomString(),
    price: 11,
    quantity: 1,
    code: `code${randomString()}`,
    _embedded: {
      'fx:item_category': {
        code: 'DEFAULT',
      },
      'fx:item_options': [
        {
          name: 'collection_id',
          value: 'COLLECTIONID',
        },
        {
          name: 'price_field',
          value: 'price',
        },
        {
          name: 'code_field',
          value: 'mysku',
        },
        {
          name: 'inventory_field',
          value: 'inventory',
        },
        {
          name: 'quantity_field',
          value: 'quantity',
        },
      ],
    },
  };
}

function basicSubscription(item) {
  const emptySubscription = {
    subscription_frequency: '',
    subscription_start_date: null,
    subscription_next_transaction_date: null,
    subscription_end_date: null,
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

  /** Set several values for all items in a collection */
  function setItemsValuesAll(items, values) {
    Object.entries(values).forEach(([k, v]) => {
      setItemsValue(items, k, v);
    });
  }

  const items = basicRequest(itemBuilder);
  if (Array.isArray(changes) && changes.length === 2) {
    setItemsValue(items._embedded['fx:items'], changes[0], changes[1]);
  } else if (typeof changes === 'object') {
    setItemsValuesAll(items._embedded['fx:items'], changes);
  }
  return {
    body: items,
  };
}

exports.itemBuilders = {
  basicItem,
  subscriptionItem,
};

exports.basic = function () {
  return basicRequest(basicItem);
};

exports.subscription = function () {
  return basicRequest(
    () => basicSubscription(basicItem()),
  );
};

exports.longCollection = function () {
  return basicRequest(basicItem, 100);
};


exports.request = foxyRequest;
