# Pre-paymente webhook for Webflow-FoxyCart 

This webhook asumes you are using a Webflow CMS Collection to store your products.

It provides you with a function to validate the price and quantity submitted to FoxyCart before a payment is made, thus providing security against HTML tampering in the client side.

It validates the cart just before payment to ensure the order is bellow inventory and that the price was not tampered.


## Configuration

It is necessary to provide the Webflow token as an environment variable `WEBFLOW_TOKEN`.

## FoxyCart Item

When adding your items to the cart, you'll need to provide the following information, beyond `price` and `quantity` that are needed for the cart:

Please note that `code` is required for this validation.

| Parameter                | Description                                                                                               | Example                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `collection_id`          | **Required** The id of the item's collection.                                                               | `collectionId=5f74f169fbbb4b118497207a`|
| `code`                   | **Required** The item's code. Must be unique.                                                               | `code=896EYSA678`                      |
| `code_field`             | Optional. The field containing the code in the collection. Defaults to `code`                               | `codeField=sku`                        |
| `price_field`            | Optional. The field containing the price in the collection. Default to `price`                              | `priceField=investment`                |
| `inventoryField`         | Optional. The field containing the price in the collection. If not provided inventory is not checked.       | `priceField=investment`                |

## Parameters

The webflow collection needs to have the following fields:

| Parameter                                        | Description                                                                                                                  | Example                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `code` or the value set in `code_field`          | A unique code for each item.                                                                                                 | `code=896EYSA678`                      |
| `price` or the value set in `price_field`        | The price to be validated.                                                                                                   | `price=256.88`                         |
| `inventory` or the value set in `inventory_field`| Optional. The field against with the quantity will be validated. If the field does not exist, this validation will be ignored| `inventory=3`                           |


## Limitations

- It does not handle discounts.
- It does not handle item options, such as `price_mod`.

## Usage example


