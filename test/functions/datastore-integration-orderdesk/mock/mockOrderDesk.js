
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
      body: JSON.stringify(data),
      headers: { },
      ok: true,
      status: 200,
      statusText: 'OK',
      url: endpoint,
    };
  }

}

const items = {
  execution_time: '0.0156 seconds',
  inventory_items: [
    {
      code: 'bubblegum',
      cost: 1.4,
      date_added: '2021-03-30 23:31:47',
      date_updated: '2021-03-30 23:31:47',
      id: 57838910,
      location: '',
      manufacturer_sku: null,
      metadata: [],
      name: 'Bubble Gum',
      price: 2,
      stock: 20,
      update_source: 'Manual',
      variation_list: [],
      weight: 0.2,
    },
    {
      code: 'lollipop',
      cost: 0.95,
      date_added: '2021-03-30 23:30:35',
      date_updated: '2021-03-30 23:30:35',
      id: 57838909,
      location: '',
      manufacturer_sku: null,
      metadata: [],
      name: 'Lollipop',
      price: 1.5,
      stock: 50,
      update_source: 'Manual',
      variation_list: [],
      weight: 0.3,
    },
    {
      code: 'candy',
      cost: 0.8,
      date_added: '2021-03-30 23:29:52',
      date_updated: '2021-03-30 23:29:52',
      id: 57838908,
      location: '',
      manufacturer_sku: null,
      metadata: [],
      name: 'Candy',
      price: 1,
      stock: 100,
      update_source: 'Manual',
      variation_list: [],
      weight: 0.01,
    }
  ],
  records_returned: 3,
  status: 'success',
  total_records: '0',
}

module.exports = {
  MockOrderDesk
}
