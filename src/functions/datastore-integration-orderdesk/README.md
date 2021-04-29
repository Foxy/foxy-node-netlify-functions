# Orderdesk DataStore Integration

This Foxy.io-OrderDesk DataStore integration provides you with:

- a **pre-payment webhook** to validate transactions prices and quantities.
- a **transaction webhook** to update OrderDesk when a transaction is created.

## What does it do?

**tldr;** This OrderDesk DataStore integration will allow you to check your inventory in
OrderDesk right before a purchase is completed, and update your inventory right
after.

### Pre-payment webhook for OrderDesk

This webhook assumes you are using OrderDesk to manage your inventory and product prices.

It provides you with a function to validate the price and quantity submitted to FoxyCart right before a payment is made, thus providing security against HTML modifications in the client side.

- It validates the cart just before payment to ensure the order is bellow inventory and that the price was not changes in the client side.
- It validates the prices of all products in a purchase.

You control what messages are displayed to the users if the validation is not successful.

You control what should happen if the webhook itself fails.

Please, notice that **it ignores existing subscriptions**.
- if a subscription start date is the current one, price will be checked. If it is in the past, the price is not checked.

#### Limitations

- It does not handle discounts.
- It does not handle item options, such as `price_mod`.

# Setup 

## Setup Overview

Here are the steps you'll have to take to set up this integration:

1. Grab your OrderDesk credentials
    - Visit https://orderdesk.com and click on the Login button.
    - On your Dashboard, click the "Store Settings" link in the left sidebar
    - Click the "API" tab (it's the rightmost tab)
    - You will find your Store Id and your API key. You will need to copy these to configure your webhook.
1. Grab your Foxy.io credentials:
    - Go to your Foxy.io store integrations page and create a JSON Webhook integration.
    - Get your Foxy.io Client credentials.
1. Deploy your Webhook to your server (we provide you with a one-click deploy button).
    - During deploy you can provide the credentials.
    - You can also do it afterwards in your Netlify dashboard.
1. Configure your prepayment webhook using your endpoint. Check the docs here: https://wiki.foxycart.com/v/2.0/pre_payment_webhook
1. Go to your Foxy.io store payments page and enable custom pre-payment hook.

## Setup Tutorial

# Configuration Reference

There are a some customization you can do to your webhook.
These are set with **environment variables** that you can set directly in Netlify dashboard.

To configure your **environment variables** follow these steps:
- go to your site admin dashboard in Netlify
- click "Site settings" button
- click the "Build & deploy" tab in the left menu
- under **Environment**, click "Edit variables"

Please, notice that the default values where chosen to match the default OrderDesk settings.
ou shouldn't need to change these values unless you are not using OrderDesk default fields.

##### Configuration

These environment variables are used to allow your webhook to authenticate authenticate with Foxy and OrderDesk.

| Variable                        | Default Value   | Description|
| ------------------------------- | --------------- | --------------------------------------------------------------------------------  |
| FOXY_WEBHOOK_ENCRYPTION_KEY     | ""         | **Required** Your Foy Refresh Token. **This value must not be shared or made public.** | 
| FOXY_ORDERDESK_API_KEY          | ""         | **Required** Your OrderDesk API Key                                                    |
| FOXY_ORDERDESK_STORE_ID         | ""         | **Required** Your OrderDesk Store id                                                   |
| FOXY_DATASTORE_CREDENTIALS      | ""         | This variable is an alternative to `FOXY_ORDERDESK_API_KEY` and `FOXY_ORDERDESK_STORE_ID`. If you provide this variable you don't have to provide those. This is meant to receive a copy of the values provided in the API tab in your OrderDesk settings.|


##### Price and Inventory verification

These environment variables are used to configure how the price and inventory verification will work.

You can skip some items from either verification.

| Variable                         | Default Value   | Example config         |Description                                                                                                                                                                                                        |
| -------------------------------- | --------------- | ---------------------- |---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FOXY_SKIP_PRICE_CODES            | ""              | "SHIRT-123, PANTS-456" |A comma separated list of code values (this is the value set in your 'sku' field in OrderDesk). **The items with these codes will skip price verification**. You can set this field to **__ALL__** in order to skip all price verification.    |
| FOXY_SKIP_INVENTORY_CODES        | ""              | "SHIRT-123, PANTS-456" |A comma separated list of code values. **The items with these codes will skip inventory verification**.  You can set this field to **__ALL__** in order to skip all inventory verification.    |
| FOXY_SKIP_INVENTORY_UPDATE_CODES | ""              | "SHIRT-123, PANTS-456" |A comma separated list of code values. **The items with these codes will skip inventory verification**.  You can set this field to **__ALL__** in order to skip all inventory verification.    |

If necessary you may change the fields the webhook will consider from OrderDesk.
This is likely unnecessary and you shouldn't change these default values unless you are not using OrderDesk default fields.

| Variable                         | Default Value   | Example config         |Description                                                                                                                                                                                                        |
| FOXY_FIELD_CODE                  | "sku"           | "code"                 |The name of the field that stores the code in OrderDesk. **There is no need to set this if you are using OrderDesk "code" as your "sku"**.                           |
| FOXY_FIELD_PRICE                 | "price"         | "value"                |The name of the field that stores the price in the OrderDesk. **There is no need to set this if you are using OrderDesk "price" field**.                             | 
| FOXY_FIELD_INVENTORY             | "stock"         | "inventory"            |The name of the field that stores the inventory in OrderDesk. **There is no need to set this if you are using OrderDesk "stock" field**. |

##### Error messages

You may want to customize the error message displayed for your costumers when a pre-payment error occurs:

To set up custom error messages, simply create new variables as described above. Here are the possible variables:

| Variable                        | Default Value                               | Description                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FOXY_ERROR_INSUFFICIENT_INVENTORY | "Insufficient inventory for these items:" | Occurs when the quantity purchased is greater than the inventory available in Orderdesk. **A comma separated list of the names of the products out-of-stock will be appended to the end of the error message**. |
| FOXY_ERROR_PRICE_MISMATCH         | "Prices do not match."                    | Occurs when the price of any of the products does not match with the `price` field in OrderDesk.                                                                                                             |



# Deploy your webhook

These are instructions for deploying the webhook to Netlify.

You may use the Deploy to Netlify button or use the fork method bellow.

## Forking the repository
### First: clone this repository

Click the fork button in the top right corner.

Cloning the repository will create your own copy of this Webhook, allowing you to both customize it if you wish and to merge upgrades as they are published.

### Second: create a new Netlify Site

Go to your Netlify account and click the "New site from Git" button.

- Choose your repository.
- Click the "Advanced" button and then "New Variable"
  - The key should be: `FOXY_DATASTORE_CREDENTIALS`
  - To get this token, go to OrderDesk settings, at the 'API' tab. Copy all the information provided.

# Upgrade your webhook

If you used the deploy to Netlify Button to deploy, you can simply redo that process.

If you are familiar with Git, you can merge the new version into your repository.

If you forked the repository, you can use the GitHub Action available in the "Actions" tab in your repository to upgrade your Webhook.
- Click the "Actions" tab. Agree to use GitHub Actions.
- Click the SyncFork workflow and then "run workflow"

If you've made customizations, there may be conflicts. In this case you par pull the changes and resolve the conflicts manually.
