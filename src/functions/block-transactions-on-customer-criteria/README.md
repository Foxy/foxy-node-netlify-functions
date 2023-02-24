# Pre-payment webhook for Blocking Transactions Based on Customer Data

This provides you with a function that executes just before payment to check customer data on the order against a blocklist and reject or accept the order based on that data.

## Usage

These are instructions for deploying the webhook to Netlify.

### Fork this repository

Click the fork button in the top right corner.

Forking the repository will create your own copy of this Webhook, allowing you to both customize it if you wish and to merge upgrades as they are published.

### Customize

Modify the matchlist.json file to include the email addresses/ip addresses/customer names that you want to block. If you don't want to block based on one of those, you can leave the array empty. Note that the examples provided are for illustrative purposes only. It'll work as is, but blocking based on IP, email or name isn't necessarily a recommended approach.

You can also modify the error message that's displayed to customers when the pre-payment webhook validation fails. The default message is "Sorry, the transaction cannot be completed." Do not remove the quotes enclosing the message.

### Create a new Netlify Site

Go to your Netlify account and click the "New site from Git" button.

- Choose your repository.

After the deploy is complete, click the "functions" tab, look for the `block-transactions-on-customer-criteria` function and copy the **Endpoint URL**.

Configure your prepayment webhook using your endpoint. Check the directions under Enabling the pre-payment hook here: https://wiki.foxycart.com/v/2.0/pre_payment_webhook#enabling_the_pre-payment_hook

# Upgrade your webhook

When new upgrades to this webhook are published, you can use the GitHub Action available in the "Actions" tab in your repository to upgrade your Webhook.

- Click the "Actions" tab. Agree to use GitHub Actions.
- Click the SyncFork workflow and then "run workflow"

This will upgrade your repository.

If you've made customizations, there may be conflicts. In this case you can pull the changes and resolve the conflicts manually.
