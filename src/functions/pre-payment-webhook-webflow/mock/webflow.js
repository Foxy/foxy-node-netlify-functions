function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
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

exports.basicRequest = {
  "items": (...new Array(5)).map(newWebflowBasicItem),
  "count":5,
  "limit":100,
  "offset":0,
  "total":5
}
