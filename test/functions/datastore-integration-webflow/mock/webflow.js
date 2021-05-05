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
      actualLimit,
      count,
      items: [...new Array(count)].map(itemBuilder),
      offset,
      total: defaultTotal,
    };
  };
}

function newWebflowBasicItem() {
  return {
    _archived: false,
    _cid: '5f74f169fbbb4b118497207a',
    _draft: false,
    _id: '5f7b82a51a262af451e86f8c',
    category: randomString(),
    category_field: 'category',
    code_field: 'mysku',
    inventory: 3584,
    mysku: randomString(),
    name: randomString(),
    price: 11,
    slug: randomString(),
  };
}

const deterministic = basicResponse(
  newWebflowBasicItem,
  100,
  500,
);

const arbitrary = function arbitrary(items, customConfig = {}, without = []) {
  const defaultConfig = {
    category: (v) => v,
    code: (v) => v,
    price: (v) => v,
    quantity: (v) => v,
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

module.exports = {
  arbitrary,
  basicResponse,
  deterministic
}
