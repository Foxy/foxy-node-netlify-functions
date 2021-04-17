
class MockOrderDesk {

  fetch(endpoint) {
    let data = {};
    const Router = [
      [/inventory-items/, items],
      [/batch-inventory-items/, items]
    ]
    for (let route of Router) {
      if (endpoint.match(route[0])) {
        data = route[1];
      }
    }
    return {  
      body: {},
      headers: { },
      json: () => Promise.resolve(data),
      ok: true,
      status: 200,
      statusText: 'OK',
      url: endpoint,
    };
  }

}

const items = {
  status: 'success',
  execution_time: '0.0156 seconds',
  records_returned: 3,
  total_records: '0',
  inventory_items: [
    {
      id: 57838910,
      name: 'Bubble Gum',
      code: 'bubblegum',
      price: 2,
      cost: 1.4,
      weight: 0.2,
      stock: 20,
      update_source: 'Manual',
      location: '',
      manufacturer_sku: null,
      metadata: [],
      variation_list: [],
      date_added: '2021-03-30 23:31:47',
      date_updated: '2021-03-30 23:31:47'
    },
    {
      id: 57838909,
      name: 'Lollipop',
      code: 'lollipop',
      price: 1.5,
      cost: 0.95,
      weight: 0.3,
      stock: 50,
      update_source: 'Manual',
      location: '',
      manufacturer_sku: null,
      metadata: [],
      variation_list: [],
      date_added: '2021-03-30 23:30:35',
      date_updated: '2021-03-30 23:30:35'
    },
    {
      id: 57838908,
      name: 'Candy',
      code: 'candy',
      price: 1,
      cost: 0.8,
      weight: 0.01,
      stock: 100,
      update_source: 'Manual',
      location: '',
      manufacturer_sku: null,
      metadata: [],
      variation_list: [],
      date_added: '2021-03-30 23:29:52',
      date_updated: '2021-03-30 23:29:52'
    }
  ]
}

module.exports = MockOrderDesk;
