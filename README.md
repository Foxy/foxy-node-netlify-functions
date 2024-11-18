# Netlify Serverless Functions for the Foxy.io API

This repository allows you to (more) easily create serverless functions to work with the Foxy.io API, deployed using Netlify.
The goal is to make this as [approachable](#Built to be approachable) as possible, so we try to have reasonable default behaviours, and Netlify is a great choice because of the one-click deployment.
Once you deploy to Netlify, you can modify your own GitHub files to customize as needed.

You may use this repository:
- directly, configuring it to your needs with environment variables
- as usage examples, to better understand the usage of Foxy API and FoxySDK.

## Functions

The functions provided in this repository are used independently.

Be sure to check the README for each function in the functions folder, as they provide specific documentation.

- Datastore integrations: 
    - [datastore-integration-webflow](src/functions/datastore-integration-webflow): Validates the price and/or availability of items against Webflow CMS collections before a payment is processed.
    - [datastore-integration-orderdesk](src/functions/datastore-integration-orderdesk): Validates the cart against OrderDesk and updates the inventory upon successful transaction.
    - [datastore-integration-wix](src/functions/datastore-integration-wix): Validates the price and/or availability of items against Wix Stores before a payment is processed.
- Other features:
  - [cart](src/functions/cart): Converts a cart between recurring and non-recurring. Useful in an upsell flow.
  - [idevaffiliate-marketplace](src/functions/idevaffiliate-marketplace): A marketplace-style integration, using iDevAffiliate.
  - [shiptheory](src/functions/shiptheory): Creates shipments in your ShipTheory account upon successful transactions.
  - [custom-tax-endpoint](src/functions/custom-tax-endpoint): Returns a custom tax configuration to the cart.


### Data Store Integrations

Data store integrations allow you to verify the cart against a third-party Data Store.

Your customer workflow is basically unchanged.

The image below shows the order flow, with the gray steps showing the functionality provided by these functions (invisible to the customer). Notice that upon cart submit the pre-payment validation is triggered. The webhook makes a request to this function, which then gets the inventory and price information from your data store (Webflow or OrderDesk), and checks if the cart is valid.

![Data Store Integration workflow](https://github.com/Foxy/foxy-node-netlify-functions/blob/feat/datastore-orderdesk/images/datastore-integrations-workflow.png?raw=true)

- You may choose not to validate prices at all or for specific items.
- You may choose not to validate the inventory.
- Depending on your data store, you may have other configuration available.


#### Available DataStores

- [OrderDesk](https://www.orderdesk.com)
- [Webflow CMS](https://webflow.com)

#### The Foxy Pre-Payment Webhook

The pre-payment webhook fires before a transaction is submitted to the payment processor (Stripe, Authorize.net, PayPal, etc.). We'll use that with these functions to prevent overselling, and also to prevent product link/form tampering if you can't use Foxy's [link+form signing](https://wiki.foxycart.com/v/2.0/hmac_validation) (either directly or via [the Cloudflare Worker hmac signing function](https://github.com/Foxy/foxy-cloudflare-addtocart-signing) to do it automatically).

**It ignores existing subscriptions**. If a subscription start date is "today", the price will be checked. If it is in the past, the price is not checked.

#### Limitations

- It does not handle discounts.
- It does not handle item options, such as `price_mod`.
- Due to netlify time limit, and the need to make requests to the datastore, it
  may break against large product databases if the Datastore do not allow for
  requesting specific items directly. Check the README for your datastore
  integration about this issue.

#### Usage

1. Read the short **Configuration** section in the datastore integration page.
  - **Important**: Your datastore must meet some criteria for the webhook to work. Product items need a `code` field.
1. Grab the credentials needed for integrating with your datastore. Check the details in your datastore integration page.
1. Click the **deploy to Netlify** button at the end of this page.
  - Netlify will provide you with a form for you to provide your configuration.
  - The Webflow Prepayment Webhook requires only `FOXY_WEBFLOW_TOKEN`. The other settings are used for the other services in this repository.
1. Grab the URL for your webhook in Netlify. Be sure to get the correct URL for your specific webhook.
  - To do this, after the deploy is finished, click the "functions" tab, look for your webhook function and copy the **Endpoint URL**.
1. Configure your prepayment webhook using your endpoint. Check the docs here: https://wiki.foxycart.com/v/2.0/pre_payment_webhook

# Configuration Reference

This section contains all **environment variables** you can use to configure the webhooks in this repository.

**You do not need to configure all these.** Check the documentation for the functions you are using for the configuration relevant to them.

This list is provided for your quick reference.

**Please, note** that the default values for these variables may be different for each function.
We try to have sensible defaults for each third party service we are integrating with and for each task we are performing.

## How to set **environment variables** in Netlify

These are set with **environment variables** that you can set directly in Netlify dashboard.

To configure your **environment variables** follow these steps:
- go to your site admin dashboard in Netlify
- click "Site settings" button
- click the "Build & deploy" tab in the left menu
- under **Environment**, click "Edit variables"

Please, notice that the default values where chosen to match the default OrderDesk settings.
You shouldn't need to change these values unless you are not using OrderDesk default fields.

This section contains all possible customizations you can do by setting environment variables.

**Attention**: After changing your environment variables you will want to **[redeploy your webhook](#redeploy-your-webhook)**.

| Environment Variable | Description |
| -------  | --- | 
|`FOXY_API_CLIENT_ID`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_API_CLIENT_SECRET`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_API_REFRESH_TOKEN`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_DEFAULT_AUTOSHIP_FREQUENCY`|[description in Cart doc](src/functions/cart#environment-variables)|
|`FOXY_ERROR_INSUFFICIENT_INVENTORY`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_ERROR_PRICE_MISMATCH`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_FIELD_CODE`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_FIELD_INVENTORY`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_FIELD_PRICE`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_IDEV_API_URL`|[description in Idev Affiliate doc](src/functions/idevaffiliate-marketplace/README.md#environment-variables)|
|`FOXY_IDEV_SECRET_KEY`|[description in Idev Affiliate doc](src/functions/idevaffiliate-marketplace/README.md#environment-variables)|
|`FOXY_ORDERDESK_API_KEY`|[description in Idev Affiliate doc](src/functions/datastore-integration-orderdesk/README.md#environment-variables)|
|`FOXY_ORDERDESK_STORE_ID`|[description in Idev Affiliate doc](src/functions/datastore-integration-orderdesk/README.md#environment-variables)|
|`FOXY_SKIP_INVENTORY_CODES`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_SKIP_INVENTORY_UPDATE_CODES`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_SKIP_PRICE_CODES`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_SKIP_UPDATEINFO_NAME`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|
|`FOXY_WEBFLOW_TOKEN`|[description in Idev Affiliate doc](src/functions/datastore-integration-webflow/README.md#environment-variables)|
|`FOXY_WEBHOOK_ENCRYPTION_KEY`| [description in Foxy Webhook doc](src/foxy/README.md#environment-variables)|

### Redeploy your webhook

If you change any of your environment variables, it will only take effect after you redeploy your webhook.

To do this, follow these steps:

- go to your Netlify dashboard;
- under "sites" click on your webhook;
- click on "Production deploys"
- on the right side, click "Trigger deploy" and then "deploy site"

The changes you've made to your environment variables will be on effect when the deploy finishes.

# Development

## Built to be approachable

This repository aims to used as a reference to users who wish to extend their use of Foxy by adding custom server-side features.

Here are some choices we've made:

- Javascript: the language is approachable in itself and widely known.
- Netlify: provides easy deployment and continuous integration with near zero configuration.
- Default behaviours: are set in according to the task, tunned to feel natural for users of the tools each function is integrating with
- Specific instructions: each function has its own README file that should be the only required reading to implement that function. This does not mean we will repeat instructions everywhere, but simply that by reading the docs of the function user will find everything needed, either on that page or on clearly provided links.

These are some goals:

- users should be able to navigate the code with ease, without usage or knowledge of advanced tools
- users should be able to copy and customize code with relative ease, without the need 


## Localdev Setup

1. `npm install -g netlify-cli`
1. `netlify login`
1. `netlify link` or `netlify init`
1. `netlify dev` will start things locally, and will launch your project at `http://localhost:8888` or comparable.

That will stay running in your terminal. Open up a new tab to your project's directory, and you can run `netlify functions:list` to see your serverless functions. You can then load them up like `http://localhost:8888/.netlify/functions/get_cart` to test.


<a href="https://app.netlify.com/start/deploy?repository=https://github.com/Foxy/foxy-node-netlify-functions"><img
src="https://www.netlify.com/img/deploy/button.svg"
alt="Deploy to Netlify"></a>

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
