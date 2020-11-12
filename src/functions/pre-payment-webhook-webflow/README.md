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
1. Click the **deploy to Netlify** button at the end of this page. Netlify will provide you with a form for you to provide your configuration. The Webflow Prepayment Webhook requires only WEBFLOW_TOKEN. The other settings are used for the other services in this repository.
1. Grab the URL for your webhook in Netlify. Be sure to get the correct URL for the webflow-prepayment-webhook. To do this, after the deploy is finished, click the "functions" tab, look for `pre-payment-webhook-webflow` function and copy the **Endpoint URL**.
1. Configure your prepayment webhook using your endpoint. Check the docs here: https://wiki.foxycart.com/v/2.0/pre_payment_webhook

## Webflow Setup

In order to use this webhook you'll need to set your Webflow collection, create buttons or forms to add the products to the cart and setup your webhook.

### In your Webflow collection, add the necessary fields

The webflow collection needs to have the following fields:


| Parameter                                        | Description                                                                                                                  | Example                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `code` or the value set in `code_field`          | A unique code for each item. You can use your `slug` if you don't have a unique field.                                       | `code=896EYSA678`                      |
| `price` or the value set in `price_field`        | The price to be validated.                                                                                                   | `price=256.88`                         |
| `inventory` or the value set in `inventory_field`| Optional. The field against with the quantity will be validated.                                                             | `inventory=3`                          |

Please note that *you don't need to change your Webflow Collection* if you already have these fields with different names.
You'll only need to add a hidden field to inform the name that you already use in Webflow.

These fields do not need to be shown to the user, but you will need to add them as parameters to foxy cart.

If you don't have use Webflow to control your inventory and you don't have an `inventory` field in your collection, the inventory verification will be ignored and the validation will pass.

If you do have an `inventory` field in your Webflow Collection, but you don't wish this to be validated, set the `inventory_field` to an empty string: `inventory_field=""`.

### When creating your FoxyCart Items

When adding your items to the cart,  beyond `price` and `quantity` that are needed for the cart, you'll need to provide the following information for the validation to work:


| Parameter                | Description                                                                                               | Example                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `collection_id`          | **Required** The id of the item's collection.                                                               | `collectionId=5f74f169fbbb4b118497207a`|
| `code`                   | **Required** The item's code. Must be unique.                                                               | `code=896EYSA678`                      |
| `code_field`             | Optional. This field value is case insensitive. The field containing the code in the collection. Defaults to `code`                               | `code_field=sku`                        |
| `price_field`            | Optional. This field value is case insensitive. The field containing the price in the collection. Default to `price`                              | `price_field=investment`                |
| `inventory_field`        | Optional. This field value is case insensitive. The field containing the inventory in the collection..       | `inventory_field=investment`                |

### When configuring your webhook server

It is necessary to provide the Webflow token as an environment variable named `WEBFLOW_TOKEN`.

Yup. That's it.

## Examples


### Basic Example
Here is a minimum example of a link button to add a product to the cart (the line breaks are for readability):

```html
<a class="button" href="https://YOURDOMAIN.foxycart.com/cart?
                        name=A+great+product&
                        price=5&
                        code=123456&
                        collection_id=123047812340791234">
 Buy this Great Product!
</a>
```

Here is what will happen in the validation considering the example above:

The webhook:

- will assume that there is a field name `inventory` in your Webflow collection, as there was no `inventory_field` provided.
- will assume that there is a field named `code` in your Webflow collection, as there was no `code_field` provided.
- will assume that there is a field named `price` in your Webflow collection, as there was no `price_field` provided.
- will fetch the data from your collection directly, find the right `code` and compare the `price` field. It will approve the purchase if the price is the same as it is stored in your collection.

### Complete Example

This example assumes that:

- you have a `sku` field in your Webflow collection that you want to use as `code` for FoxyCart.
- you have a `value` field in your Webflow collection that you use to store the price.
- you have a `inventory` field in your Webflow collection that you use to control your inventory. This field stores a numeric value.
- your client is purchasing 2 units of this particular product.

As you can see, it will be necessary to customize the `code` and `value` fields.

Here is how that is done:

```html
<a class="button" href="https://YOURDOMAIN.foxycart.com/cart?name=A+great+product&price=5&price_field=value&code=123456&code_field=sku&quantity=2&inventory_field=inventory&collection_id=123047812340791234">
 Buy this Great Product!
</a>
```

# Deploy your webhook

These are instructions for deploying the webhook to Netlify.

### First: clone this repository

Click the fork button on the top right corner.

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

