# Custom Tax Endpoint

This provides you with a function that executes when the address is entered on the checkout, custom calculates, and sends tax rate and amount to the Foxy cart.

## Usage

These are instructions for deploying the webhook to Netlify.

### Fork this repository

Click the fork button in the top right corner.

Forking the repository will create your own copy of this endpoint, allowing you to both customize it if you wish and to merge upgrades as they are published.

### Customize

Modify the code in the example to your specific logic for your tax rates. The payload that is received by the endpoint is shown in our documentation here: https://wiki.foxycart.com/v/2.0/webhooks

The logical rules for this example are the following:
* The tax rate for all US orders is 0% (no tax)
* The tax rate outside the US is 5% for all customers adding items to the cart with a category of **dealer** and 12% for all other categories outside the US.
* The tax rate is applied to the total money amount of the items in the cart, plus shipping, minus any discounts.

### Create a new Netlify Site

Go to your Netlify account and click the "New site from Git" button.

- Choose your repository.

After the deploy is complete, click the "functions" tab, look for the `custom-tax-endpoint` function and copy the **Endpoint URL**.

Configure your custom tax integration using your endpoint. 
* Go to the [integrations settings](https://admin.foxycart.com/admin.php?ThisAction=AddIntegration) in the Foxy admin.
* Select the **CUSTOM TAX ENDPOINT** option
* In **url**, paste the URL that you copied previously
* Save the setting

# Upgrade your webhook

When new upgrades to this webhook are published, you can use the GitHub Action available in the "Actions" tab in your repository to upgrade your Webhook.

- Click the "Actions" tab. Agree to use GitHub Actions.
- Click the SyncFork workflow and then "run workflow"

This will upgrade your repository.

If you've made customizations, there may be conflicts. In this case you can pull the changes and resolve the conflicts manually.
