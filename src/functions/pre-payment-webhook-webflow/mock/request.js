function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}

function newBasicItem() {
  return {
    name: randomString(),
    price: (Math.random() * 200).toFixed(2),
    quantity: parseInt(Math.random() * 10, 10),
    code: `code${randomString()}`,
    _embedded: {
      'fx:item_options': [
        {
          name: 'collection_id',
          value: 'COLLECTIONID'
        },
        {
          name: 'price_field',
          value: 'price',
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

function newItemRandomCollection() {
  const basic = newBasicItem();
  basic._embedded['fx:item_options'][0].value = randomString();
  return basic;
}

exports.basicRequest = {
  _links: {
  },
  _embedded: {
    'fx:items': [
      {
        _links: {
        },
        _embedded: {
          'fx:item_options': [
            {
              _links: {
              },
              name: 'size',
              value: 'medium',
              price_mod: 0,
              weight_mod: 0,
              date_created: null,
              date_modified: null,
            },
            {
              _links: {
              },
              name: 'color',
              value: 'red',
              price_mod: 0,
              weight_mod: 0,
              date_created: null,
              date_modified: null,
            },
          ],
          'fx:item_category': {},
        },
        name: 'Example Product',
        price: 15.99,
        quantity: 1,
        code: 'abc123',
      },
      {
        _embedded: {
          'fx:item_category': {},
        },
        name: 'Another Product',
        price: 20,
        quantity: 1,
        code: 'foo321',
      },
    ],
    'fx:discounts': [
      {
        code: 'coupon',
        amount: -3.6,
        name: 'Default Discount',
        display: '-$3.60',
        is_taxable: false,
        is_future_discount: false,
      },
    ],
    'fx:custom_fields': [
      {
        name: 'custom_note',
        value: 'Happy Birthday!',
        is_hidden: 0,
      }],
    'fx:shipment': {
      address_name: '',
      first_name: 'John',
      last_name: 'Smith',
      company: '',
      address1: 'Main Street',
      address2: '',
      city: 'Saint Paul',
      region: 'MN',
      postal_code: '55116',
      country: 'US',
      origin_region: 'TX',
      origin_postal_code: '77018',
      origin_country: 'US',
      shipping_service_id: 0,
      shipping_service_description: '',
      is_residential: false,
      item_count: 2,
      total_weight: 5,
      total_customs_value: 0,
      total_handling_fee: 0,
      total_flat_rate_shipping: 5,
      total_item_price: 35.99,
      total_tax: 3.24,
      total_shipping: 0,
      total_price: 39.23,
    },
    'fx:customer': {
      id: '1512345',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@example.com',
      tax_id: '',
      is_anonymous: '0',
      _embedded: {
        'fx:payments': [
          {
            cc_type: 'plastic',
            cc_number_masked: 'xxxx xxxx xxxx 4242',
            cc_exp_month: '10',
            cc_exp_year: '2020',
            purchase_order: null,
          },
        ],
        'fx:default_billing_address': {
          country: 'US',
          region: 'MN',
          city: 'Saint Paul',
          postal_code: '55116',
          address1: 'Main Street',
          address2: '',
          company: '',
          full_name: 'John Smith',
          first_name: 'John',
          last_name: 'Smith',
          phone: '',
        },
      },
    },
  },
  customer_uri: '',
  template_set_uri: '',
  language: '',
  locale_code: 'en_US',
  customer_ip: '192.168.0.1',
  ip_country: 'United States',
  session_name: 'fcsid',
  session_id: 'hvcv28l8md0qc8qt5rrjh4qo85',
  total_item_price: 35.99,
  total_tax: 3.24,
  total_shipping: 14.23,
  total_future_shipping: 0,
  total_order: 49.86,
  date_created: null,
  date_modified: '2017-07-20T04:12:25-0700',
};

exports.longCollection = {
  _links: {
  },
  _embedded: {
    'fx:items': [... new Array(100)].map(newBasicItem),
  },
  template_set_uri: '',
  locale_code: 'en_US',
  total_item_price: 35.99,
  total_tax: 3.24,
  total_order: 49.86,
};

exports.randomCollections = {
  _links: {
  },
  _embedded: {
    'fx:items': new Array(10).map(newItemRandomCollection),
  },
  template_set_uri: '',
  locale_code: 'en_US',
  total_item_price: 35.99,
  total_tax: 3.24,
  total_order: 49.86,
};
