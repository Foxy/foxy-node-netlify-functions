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

exports.deterministic = function () {
  return basicRequest(basicItem);
};

exports.longCollection = function () {
  return basicRequest(basicItem, 100);
};
