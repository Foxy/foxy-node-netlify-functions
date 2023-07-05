# Lune Integration for CO2 Offset Order creation

This Foxy.io-Lune integration provides you with:

- a **custom shipping code** to add to the Custom Shipping Code feature on your Foxy Store Admin [Shipping Page](https://admin.foxycart.com/admin.php?ThisAction=ShippingSetup), for getting live shipping rates with CO2 offset estimates. The code is on the `custom-shipping-code.js` file under this folder.
- a **transaction webhook** to create an CO2 offset Order in Lune when a transaction is created.

## Usage

### Overview

- Sign up with Lune, and get an API key.
- Create Foxy OAuth Client Integration on the [Foxy Admin Integrations page](https://admin.foxycart.com/admin.php?ThisAction=AddIntegration), and save the credentials.
- Add the custom shipping code on your Foxy Store Admin [Shipping Page](https://admin.foxycart.com/admin.php?ThisAction=ShippingSetup), using the code on the `custom-shipping-code.js` file, filling in the data needed on the code from the OAuth client and Lune. There are other configuration variables that need data for the shipping code to work correctly, like the originAddress.
- Deploy this repository to your Netlify account.
- Set the environment variables
- Deploy the site

Notes:

- You will also need to configure your Lune account default project bundles, and billing info.
- Note that this integration doesn't handle multi ship transactions. It will only calculate shipping rates with CO2 offset for one shipping, and it will grab the information from the first shipment to create a CO2 offset order in lune.

### Deploy this repository to Netlify

1. Click the **Fork** button at the top right corner of this page
2. Log in your Netlify account
3. Add a new site and select the **Import an existing project** option
4. Connect your GitHub account and choose your repository (the repository name should be something like `your-github-username/foxy-node-netlify-functions`)
5. In the site settings, click the **Show advanced** button
6. Under the Advanced build settings section, click the **New variable** button, you will add two environment variables.
7. In the Key field, enter `LUNE_API_KEY`
8. In the Value field, enter your Lune API key
9. Deploy the site

### Create a new Foxy Webhook

After the deploy is complete, click the "functions" tab, look for the `lune-integration` function and copy the **Endpoint URL**.

Configure your webhook using your endpoint URL.

Specify a query string value within the `API filter query string` with the following parameters:

```
zoom=applied_taxes,billing_addresses,custom_fields,customer,discounts,items,items:item_category,items:item_options,payments,shipments,attributes
```

Then click on `Update Webhooks Next`

## Upgrade your webhook

When new upgrades to this webhook are published, you can use the GitHub Action available in the "Actions" tab in your repository to upgrade your Webhook.

- Click the "Actions" tab. Agree to use GitHub Actions.
- Click the SyncFork workflow and then "run workflow"

This will upgrade your repository.

If you've made customizations, there may be conflicts. In this case you can pull the changes and resolve the conflicts manually.
