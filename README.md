# Netlify Serverless Functions for the Foxy.io API

This repository allows for easily creating serverless functions to work with the Foxy.io API, deployed using Netlify. The goal is to make this as approachable as possible, so we're avoiding unnecessary

## Functions

The functions provided in this repository can be used independently, or as a reference for building your own functinos.
Be sure to check the README for each function in the functions folder.

- [cart](src/functions/cart): Converts a cart between recurring and non-recurring.
- [idevaffiliate-marketplace](src/functions/idevaffiliate-marketplace): Integration with iDev Affiliate.
- Datastore integrations: 
    - [pre-payment-webhook-webflow](src/functions/pre-payment-webhook-webflow): Validates the price and/or availability of items against Webflow CMS collections before a payment is processed.
    - [datastore-integration-orderdesk](src/functions/datastore-integration-orderdesk): Validates the cart against OrderDesk and updates the inventory upon successful transaction.

### Data store integrations

Data store integrations allow you to verify the cart against a third-party Data
Store.

Your customer workflow is basically unchanged.

The workflow bellow shows in gray steps that are invisible to your customers.
Notice that upon cart submit the pre-payment validation is triggered. It is get
the inventory and price information from your data store (Webflow and OrderDesk
are available) and check if the cart is valid.

![Data Store Integration workflow](/images/datastore-integration-workflow.png)

- You may choose not to validate prices at all or for specific items.
- You may choose not to validate the inventory
- Depending on your data store, you may have other configuration available.


## Available DataStores

- OrderDesk
- Webflow CMS

## Pre-payment

It provides you with a function to validate the price and quantity submitted to
FoxyCart before a payment is made, thus providing security against HTML
modifications in the client side.

**It ignores existing subscriptions**. If a subscription start date is current,
price will be checked. If it is in the past, the price is not checked.

#### Limitations

- It does not handle discounts.
- It does not handle item options, such as `price_mod`.
- Due to netlify time limit, and the need to make requests to the datastore, it
  may break against large product databases if the Datastore do not allow for
  requesting specific items directly. Check the README for your datastore
  integration about this issue.

## Usage

1. Read the short **Configuration** section in the datastore integration page.
  - **Important**: your datastore need to meet some criteria for the webhook to work. Product items need a `code` field.
1. Grab the credentials needed for integrating with your datastore. Check the details in your datastore integration page.
1. Click the **deploy to Netlify** button at the end of this page.
  - Netlify will provide you with a form for you to provide your configuration.
  - The Webflow Prepayment Webhook requires only FOXY_WEBFLOW_TOKEN. The other settings are used for the other services in this repository.
1. Grab the URL for your webhook in Netlify. Be sure to get the correct URL for your specific webhook.
  - To do this, after the deploy is finished, click the "functions" tab, look for your webhook function and copy the **Endpoint URL**.
1. Configure your prepayment webhook using your endpoint. Check the docs here: https://wiki.foxycart.com/v/2.0/pre_payment_webhook


# Development

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
