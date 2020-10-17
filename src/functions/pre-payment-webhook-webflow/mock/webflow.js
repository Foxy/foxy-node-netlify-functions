function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}

function basicResponse(itemBuilder, limit = 10, total = 100) {
  const defaultLimit = limit;
  const defaultTotal = total;
  return function (context, options) {
    const actualLimit = options.limit ? options.limit : defaultLimit;
    const offset = options.offset ? options.offset : 0;
    const count = Math.min(defaultTotal - offset, actualLimit);
    return {
      items: [...new Array(count)].map(itemBuilder),
      count,
      actualLimit,
      offset,
      total: defaultTotal,
    };
  };
}

function newWebflowBasicItem() {
  return {
    _archived: false,
    _draft: false,
    price: 11,
    inventory: 3584,
    mysku: randomString(),
    code_field: 'mysku',
    category_field: 'category',
    category: randomString(),
    name: randomString(),
    slug: randomString(),
    _cid: '5f74f169fbbb4b118497207a',
    _id: '5f7b82a51a262af451e86f8c',
  };
}

exports.deterministic = basicResponse(
  newWebflowBasicItem,
  100,
  500,
);

exports.arbitrary = function arbitrary(items, customConfig = {}, without = []) {
  const defaultConfig = {
    price: (v) => v,
    quantity: (v) => v,
    code: (v) => v,
    category: (v) => v,
  };
  const config = { ...defaultConfig, ...customConfig };
  return (context, options) => {
    const r = basicResponse(newWebflowBasicItem,
      100,
      500)(context, options);
    for (let i = 0; i < items.length; i += 1) {
      if (config.price instanceof Function) {
        r.items[i].price = config.price(items[i].price);
      }
      if (config.inventory instanceof Function) {
        r.items[i].inventory = config.inventory(items[i].quantity);
      }
      if (config.code instanceof Function) {
        r.items[i][r.items[i].code_field] = config.code(items[i].code);
      }
      if (config.category instanceof Function) {
        r.items[i][r.items[i].category_field] = config.category(items[i].category);
      }
      without.forEach((w) => {
        delete r.items[i][w];
      });
    }
    return r;
  };
};
