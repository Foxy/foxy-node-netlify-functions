# Foxy Webhook

This module aims to consolidate the interaction with Foxy Webhooks.

- use FoxySDK to validate the Foxy Webhook Signature
- provide default responses

## Webhook validation

The webhook validation is optional and is performed if the
`FOXY_WEBHOOK_ENCRYPTION_KEY` environment variable is set. If it is not set
requests are presumed to be from Foxy.

## Environment variables

These environment variables are used to configure datastore functions.

| Variable                   | Default Value   | Description|
| -------------------------- | --------------- | ------------------- |
| `FOXY_API_CLIENT_ID`         | ""      | **Required** Your Foxy Client Id. |
| `FOXY_API_CLIENT_SECRET`     | ""      | **Required** Your Foxy Client Secret.|
| `FOXY_API_REFRESH_TOKEN `    | ""      | **Required** Your Foxy Client Refresh Token.|
| `FOXY_WEBHOOK_ENCRYPTION_KEY`     | "" | **Required** Your wehook encryption key. **This value must not be shared or made public.** |
| `FOXY_ERROR_INSUFFICIENT_INVENTORY` | "Insufficient inventory for these items:" | Occurs when the quantity purchased is greater than the inventory available in Webflow. **A comma separated list of the names of the products out-of-stock will be appended to the end of the error message**. |
| `FOXY_ERROR_PRICE_MISMATCH`         | "Prices do not match."                    | Occurs when the price of any of the products does not match with the `price` field in Webflow |
| `FOXY_FIELD_CODE`                   | "code"\* | The name of the field that stores the code in the webflow collection.                                                                                                                                              |
| `FOXY_FIELD_PRICE`                  | "price"\* | The name of the field that stores the price in the webflow collection.                                                                                                                                             |
| `FOXY_FIELD_INVENTORY`              | "inventory"\* | The name of the field that stores the inventory in the webflow collection. Set this variable to "false" (without the quotes) to disable inventory verification for all items.                                      |
| `FOXY_SKIP_INVENTORY_CODES`         | ""\* | A comma separated list of code values (this is the value set in your 'code' field in Webflow or in the field you set with `code_field` parameter. **The items with these codes will skip inventory verification**. |
| `FOXY_SKIP_PRICE_CODES`             | ""\* | A comma separated list of code values (this is the value set in your 'code' field in Webflow or in the field you set with `code_field` parameter. **The items with these codes will skip price verification**.     |
| `FOXY_SKIP_INVENTORY_CODES`         | ""\* | A comma separated list of code values (this is the value set in your 'code' field in Webflow or in the field you set with `code_field` parameter. **The items with these codes will skip inventory verification**. |
| `FOXY_SKIP_UPDATEINFO_NAME`         | "Update Your Customer Information" | The name of the `updateinfo` product for your store, to be ignored from any verifications. |

\* These default values may be different for some functions.
Please, check the specific documentation for the function you are using.

