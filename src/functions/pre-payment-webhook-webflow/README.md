# Pre-paymente webhook for Webflow-FoxyCart 

This webhook asumes you are using a Webflow CMS Collection to store your products.

It provides you with a function to validate the price and quantity submitted to FoxyCart before a payment is made, thus providing security against HTML tampering in the client side.

Here is a simple example of how it works:

```
http://myserver/functions/pre-payment-webhook-webflow?collectionId=A&code=B&price=C&codeField=D
```

## Configuration

It is necessary to provide the Webflow token as an environment variable `WEBFLOW_TOKEN`.

## Parameters

This webhook accepts the following parameters


| Parameter                  | Description                                                                                               | Example                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `collectionId`           | **Required** The id of the item's collection.                                                               | `collectionId=5f74f169fbbb4b118497207a`|
| `code`                   | **Required** The item's code. Must be unique.                                                               | `code=896EYSA678`                      |
| `codeField`              | Optional. The field containing the code in the collection. Defaults to `code`                               | `codeField=sku`                        |
| `price`                  | Optional. The price to be validated. **Either price or quantity must be provided**. Your store subdomain.   | `price=256.88`                         |
| `priceField`             | Optional. The field containing the price in the collection. Default to `price`                              | `priceField=investment`                |
| `quantity`               | Optional. The quantity to be validated. **Either price or quantity must be provided**.                      | `quantity=3`                           |
| `inventoryField`         | Optional. The field containing the price in the collection. If not provided inventory is not checked.       | `priceField=investment`                |

## Responses


| Code   | Message                        | Description                                                                                                                             |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `503`  | Webflow token not configured.  | No Webflow token was found. The server will not be able to communicate with Webflow.                                                    |
| `400`  | Bad request                    | A required parameter was not provided. Besides `collectionId` and `code` either `price` or `quantity` must be provided to be validated. |
| `429`  | Rate limit reached             | The maximum number of requests per minute to Webflow was reachd. It returns the object describing the error.                            |
| `404`  | Not found.                     | All items in the collection were checked and no one matches the provided `code` in the provided `codeField`.                            |
| `200`  | `{correctPrice: boolean, sufficientInventory: boolean, item: Object}`| An object describing the validation results: it contains validation for the price and inventory. Additionally, returns the item as retrieved from Webflow. |


