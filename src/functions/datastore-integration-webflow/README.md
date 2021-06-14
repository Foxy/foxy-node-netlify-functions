# Pre-payment webhook for Webflow-FoxyCart

This webhook assumes you are using a Webflow CMS Collection to store your products.

It provides you with a function to validate the price and quantity submitted to FoxyCart before a payment is made, thus providing security against HTML modifications in the client side.

It validates the cart just before payment to ensure the order is bellow inventory and that the price was not changes in the client side.

It validates the prices of all products in a purchase, regardless of if they are in the same webflow collection, therefore, you can have multiple collections with products in your CMS.

**It ignores existing subscriptions**. If a subscription start date is current, price will be checked. If it is in the past, the price is not checked.

#### Limitations

- It does not handle discounts.
- It does not handle item options, such as `price_mod`.
- Due to netlify time limit and webflow request limit, it will break on collections with thousands of products

## Usage

1. Read the short configuration section bellow to make sure your Webflow Collection and FoxyCart links are all set;
   - **Important**: your webflow collection and your add to cart buttons/forms need to be properly configured for the webhook to work. Product items need a `code` field.
1. Grab your Webflow token: https://university.webflow.com/lesson/intro-to-the-webflow-api#generating-an-api-access-token;
1. Click the **deploy to Netlify** button at the end of this page. Netlify will provide you with a form for you to provide your configuration. The Webflow Prepayment Webhook requires only `FOXY_WEBFLOW_TOKEN`. The other settings are used for the other services in this repository.
1. Grab the URL for your webhook in Netlify. Be sure to get the correct URL for the webflow-prepayment-webhook. To do this, after the deploy is finished, click the "functions" tab, look for `pre-payment-webhook-webflow` function and copy the **Endpoint URL**.
1. Configure your prepayment webhook using your endpoint. Check the docs here: https://wiki.foxycart.com/v/2.0/pre_payment_webhook

## Webflow Setup

In order to use this webhook you'll need to set your Webflow collection, create buttons or forms to add the products to the cart and setup your webhook.

### In your Webflow collection, add the necessary fields

The webflow collection needs to have the following fields:

| Parameter                                         | Description                                                                                                                                                     | Example value in a Webflow Item |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `code` or the parameter set in `FOXY_FIELD_CODE`    | for each item. You can use your `slug` if you don't have a unique field, simply set `FOXY_FIELD_CODE` to slug (see configuration bellow)                          | `code=896EYSA678`               |
| `price`                                           | The price to be validated.                                                                                                                                      | `price=256.88`                  |
| `inventory`                                       | Optional. The field against which the quantity will be validated. If this value does not exist in a collection, inventory won't be checked for that collection. | `inventory=3`                   |


If you don't use Webflow to control your inventory, and you don't have an `inventory` field in your collection, the inventory verification will be ignored. The validation will pass.

If you do have an `inventory` field in your Webflow Collection, but you don't wish this to be validated, you will need to configure the `FOXY_FIELD_INVENTORY` to "false" (see "Configuration" bellow).

### When creating your FoxyCart Items

When adding your items to the cart, beyond `price` and `quantity` that are needed for the cart, you'll need to provide the following information for the validation to work:

| Parameter         | Description                                                                                                          | Example                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `collection_id`   | **Optional** The id of the item's collection. If a default collection_id is provided, this field may be ignored. If both are provided, this field overrides the default collection_id.  | `collectionId=5f74f169fbbb4b118497207a` |
| `code`            | **Required** The item's code. Must be unique.                                                                        | `code=896EYSA678`                       |


### When configuring your webhook server

It is necessary to provide the Webflow token as an environment variable named `WEBFLOW_TOKEN`.

All other configuration is optional.

#### Configuration

There are a few possible customizations you can do to your webhook. These are set with environment variables that you can set in Netlify.

This step is optional. 

##### Price verification

You may have some items you don't want to be subject to price verification. This is the case, for example, for donations and gift cards where the user may be expected to customize the price.

| Variable                        | Default Value                             | Description                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FOXY_SKIP_PRICE_CODES`         | ""                                        | A comma separated list of code values (this is the value set in your 'code' field in Webflow or in the field you set with `code_field` parameter. **The items with these codes will skip price verification**.     |
| `FOXY_SKIP_INVENTORY_CODES`     | ""                                        | A comma separated list of code values (this is the value set in your 'code' field in Webflow or in the field you set with `code_field` parameter. **The items with these codes will skip inventory verification**. |
| `FOXY_FIELD_CODE`               | "code"                                    | The name of the field that stores the code in the webflow collection.                                                                                                                                              |
| `FOXY_FIELD_PRICE`              | "price"                                   | The name of the field that stores the price in the webflow collection.                                                                                                                                             |
| `FOXY_FIELD_INVENTORY`          | "inventory"                               | The name of the field that stores the inventory in the webflow collection. Set this variable to "false" (without the quotes) to disable inventory verification for all items.                                      |
| `FOXY_WEBFLOW_COLLECTION`       | ""                                        | The id of the collection that contains the products. If this is set, there is no need to set `collection_id` in the HTML.                                                                                          |

##### Error messages

You may want to customize the error message displayed for your costumers when a pre-payment error occurs:

To set up custom error messages, simply create new variables as described above. Here are the possible variables:

| Variable                        | Default Value                             | Description                                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FOXY_ERROR_INSUFFICIENT_INVENTORY` | "Insufficient inventory for these items:" | Occurs when the quantity purchased is greater than the inventory available in Webflow. **A comma separated list of the names of the products out-of-stock will be appended to the end of the error message**. |
| `FOXY_ERROR_PRICE_MISMATCH`         | "Prices do not match."                    | Occurs when the price of any of the products does not match with the `price` field in Webflow                                                                                                             |

## Examples

### Basic Example: no customization

Here is a minimum example of a link button to add a product to the cart (the line breaks are for readability):

```html
<a
  class="button"
  href="https://YOURDOMAIN.foxycart.com/cart?
                        name=A+great+product&
                        price=5&
                        code=123456&
                        collection_id=123047812340791234"
>
  Buy this Great Product!
</a>
```

Here is what will happen in the validation considering the example above:

The webhook:
- will assume that there is a field name `inventory` in your Webflow collection.
- will assume that there is a field named `code` in your Webflow collection. 
- will assume that there is a field named `price` in your Webflow collection.
- will fetch the data from your collection directly, find the right `code` and compare the `price` field. It will approve the purchase if the price is the same as it is stored in your collection, and the inventory is sufficient.

### Customization example: customized `code` field.

This example assumes that:

- you have a `sku` field in your Webflow collection that you want to use as `code` for FoxyCart.

In this scenario you need to create an environment variable in Netlify with the key `FOXY_FIELD_CODE` and value `sku`

Here is how that is done:

```html
<a
  class="button"
  href="https://YOURDOMAIN.foxycart.com/cart?
                    name=A+great+product&
                    price=5&
                    code=123456&
                    quantity=2&
                    collection_id=123047812340791234"
>
  Buy this Great Product!
</a>
```

The webhook:
- will assume that there is a field name `inventory` in your Webflow collection.
- will assume that there is a field named `sku` in your Webflow collection (As set in the environment variable).
- will assume that there is a field named `price` in your Webflow collection.
- will fetch the data from your collection directly, find item with `sku` matching the `code` and compare the `price` field. It will approve the purchase if the price is the same as it is stored in your collection, and the inventory is sufficient.

# Deploy your webhook

These are instructions for deploying the webhook to Netlify.

### First: clone this repository

Click the fork button in the top right corner.

Cloning the repository will create your own copy of this Webhook, allowing you to both customize it if you wish and to merge upgrades as they are published.

### Second: create a new Netlify Site

Go to your Netlify account and click the "New site from Git" button.

- Choose your repository.
- Click the "Advanced" button and then "New Variable"
  - The key should be: `WEBFLOW_TOKEN`
  - To get this token, go to Webflow's project settings, at the 'Integrations' tab."



# Upgrade your webhook

When new upgrades to this webhook are published, you can use the GitHub Action
available in the "Actions" tab in your repository to upgrade your Webhook.

- Click the "Actions" tab. Agree to use GitHub Actions.
- Click the SyncFork workflow and then "run workflow"

This will upgrade your repository.

If you've made customizations, there may be conflicts. In this case you par pull the changes and resolve the conflicts manually.
