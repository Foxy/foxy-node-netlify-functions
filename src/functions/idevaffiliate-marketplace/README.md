
# Idev Affiliate Integration

This Foxy.io-Idev Affiliate integration provides you with:

- a **transaction webhook** to send transactions to Idev Affiliate when a transaction is created.


# Setup 

## Setup Overview

Here are the steps you'll have to take to set up this integration:

1. Grab your IdevAffiliate API URL and Secret Key
1. Grab your Foxy.io Encryption Key
1. Deploy the webhook
1. Configure you Environment variables

## Setup Tutorial

1. Grab your IdevAffiliate credentials
    - Visit your Idev Affiliate admin dashboard
    - Under "System settings" click on "General Settings"
    - Copy the value of `iDevAffiliate Installation URL`. That is your `FOXY_IDEV_API_URL`
    - Under "Tools" (top-right, before "Logs"), click on "API"
    - Click on "API Secret Key" tab
    - Copy the value of `Secret Key`. That is your `FOXY_IDEV_SECRET_KEY`
1. Grab your Foxy.io credentials:
    - Go to your Foxy.io store integrations page and create a JSON Webhook integration.
    - Copy the value of `Encryption Key`. That is your `FOXY_WEBHOOK_ENCRYPTION_KEY`
1. Deploy your Webhook to your Netlify server.
    - Fork this repository (use the button on the top-right corner)
    - Go to your Netlify account and click "New site from Git"
    - Choose "GitHub"
    - Choose the repository you've just cloned
    - You may accept the other values as they are and click "Deploy site"
    - Click "Site settings"
    - On the right sidebar, click "Build & deploy".
    - Click "Environment"
    - Click "Edit variables"
    - Refer to ["Configuration"](#configuration) section bellow to create your environment variables.
1. Configure your **transaction/created** 
    - Go to your [Foxy.io Admin page](https://admin.foxycart.com/admin.php)
    - Under "Account", click ["integrations]"(https://admin.foxycart.com/admin.php?ThisAction=AddIntegration) 
    - Check the "JSON Webhook" box and paste the same Endpoint you copied from your Netlify function in the URL field.
    - Give it a title that makes sense to you.
    - Copy the value from the "Encryption Key" field.
    - Go to your Netlify dashboard again to add new Environment variables
    - Add the `FOXY_WEBHOOK_ENCRYPTION_KEY` variable with the Encryption Key you've just copied.

# Configuration Reference

There are a some customization you can do to your webhook.
These are set with **environment variables** that you can set directly in Netlify dashboard.

To configure your **environment variables** follow these steps:
- go to your site admin dashboard in Netlify
- click "Site settings" button
- click the "Build & deploy" tab in the left menu
- under **Environment**, click "Edit variables"

After changing your environment variables you may want to redeploy your webhook.

##### Environment variables

These environment variables are used to allow your webhook to authenticate authenticate with Foxy and OrderDesk.


| Variable                        | Default Value   | Description|
| ------------------------------- | --------------- | --------------------------------------------------------------------------------  |
| `FOXY_WEBHOOK_ENCRYPTION_KEY`     | ""         | **Required** Your wehook encryption key. **This value must not be shared or made public.** | 
| `FOXY_IDEV_API_URL`          | ""         | **Required** Your Idev Affiliate Instalation URL |
| `FOXY_IDEV_SECRET_KEY`         | ""         | **Required** Your Idev Affiliate secret key|
