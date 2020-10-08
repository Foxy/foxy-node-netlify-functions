function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}

function basicResponse(itemBuilder, limit=10, total=100) {
  const defaultLimit = limit;
  const defaultTotal = total;
  return  function(context, options){
    const limit = options.limit ? options.limit : defaultLimit;
    const offset = options.offset ? options.offset : 0;
    const count = Math.min(defaultTotal - offset, limit);
    return {
      "items": [...new Array(count)].map(itemBuilder),
      "count": count,
      "limit": limit,
      "offset": offset,
      "total": defaultTotal
    }
  }
}

function newWebflowBasicItem() {
  return {
    "_archived":false,
    "_draft":false,
    "price": 11,
    "inventory":3584,
    "mysku":randomString(),
    "code_field":"mysku",
    "name":randomString(),
    "slug":randomString(),
    "_cid":"5f74f169fbbb4b118497207a",
    "_id":"5f7b82a51a262af451e86f8c"
  }
}

function newWebflowInsuficientStorageItem() {
  const basic = newWebflowBasicItem();
  basic.inventory = 0;
  return basic;
}

function newWebflowTamperedPrice() {
  const basic = newWebflowBasicItem();
  basic.price = 1;
  return basic;
}

exports.deterministic = basicResponse(
  newWebflowBasicItem,
  100,
  500
);

exports.arbitrary = function(items) {
  return function(context, options) {
    r = basicResponse(newWebflowBasicItem,
                      100,
                      500)(context, options);
    for (let i=0; i < items.length; i++) {
      r.items[i].price = items[i].price;
      r.items[i].quantity = 1;
      r.items[i][r.items[i]['code_field']] = items[i].code;
    }
    return r;
  }
}

