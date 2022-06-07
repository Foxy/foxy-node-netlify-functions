# VAT ID Validation Using Vatlayer

This pre-payment webhook validates customer's VAT ID using [Vatlayer](https://vatlayer.com/). It is triggered when a customer submits the checkout request.

## Usage

### Sign up with Vatlayer

A Vatlayer account is required for this pre-payment webhook to work. A free plan supports up to 100 requests per month, with paid plans that support more.

### Deploy this repository to Netlify

1. Click the **Fork** button at the top right corner of this page
2. Log in your Netlify account
3. Add a new site and select the **Import an existing project** option
4. Connect your GitHub account and choose your repository (the repository name should be something like `your-github-username/foxy-node-netlify-functions`)
5. In the site settings, click the **Show advanced** button
6. Under the Advanced build settings section, click the **New variable** button
7. In the Key field, enter `VATLAYER_ACCESS_KEY`
8. In the Value field, enter your Vatlayer API access key
9. Deploy the site

### Configure the pre-payment webhook in Foxy

1. After the site is deployed successfully on Netlify, click the **Functions** tab from the navigation bar
2. Select the `validate-tax-id` function from the list
3. On the function summary page, copy the endpoint URL
4. Log in your Foxy account and go to the [payment settings](https://admin.foxycart.com/admin.php?ThisAction=EditPaymentGateway)
5. Under the Custom Webhooks section, check the **enable custom pre-payment hook** checkbox
6. In the pre-payment hook url text field, paste your Netlify function endpoint URL from step 3
7. Select an option for the failure handling setting
8. Click the **Update Payment Gateway** button at the bottom of the page to save the settings

## Upgrade your webhook

When new upgrades to this webhook are published, you can use the GitHub Action available in the "Actions" tab in your repository to upgrade your Webhook.

- Click the "Actions" tab. Agree to use GitHub Actions.
- Click the SyncFork workflow and then "run workflow"

This will upgrade your repository.

If you've made customizations, there may be conflicts. In this case you can pull the changes and resolve the conflicts manually.
