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

exports.arbitrary = function arbitrary(items,
  config = { price: true, quantity: true, code: true }) {
  return (context, options) => {
    const r = basicResponse(newWebflowBasicItem,
      100,
      500)(context, options);
    for (let i = 0; i < items.length; i += 1) {
      if (config.price) r.items[i].price = items[i].price;
      if (config.quantity) r.items[i].quantity = 1;
      if (config.code) r.items[i][r.items[i].code_field] = items[i].code;
    }
    return r;
  };
};
