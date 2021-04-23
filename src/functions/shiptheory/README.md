# ShipTheory

This integration allows you to create shipments in ShipTheory for Foxy.io transactions.

It will create a new unlabelled shipment in ShipTheory for each Foxy Transaction.
At this point, this webhook asumes there is one shipment per transaction,
containing all items purchased.


## How to use it

#### Overview
- Deploy this repository to your Netlify account.
- Set the environment variables
- Configure your Foxy Store JSON Webhook

You will also need to configure your SipTheory rules.

### Deploy

You can use the "Deploy to Netlify" button at https://github.com/Foxy/foxy-node-netlify-functions or clone this repository.

If you cloned the repository, go to Netlify and click "New site from Git" and choose your repository.

### Set the environment variables

When the deploy is finished:
- click the "Site settings" button;
- on the sidebar, click "Build & Deploy"
- Under "Environment", click "Edit variables"
- Create a `FOXY_SHIPTHEORY_EMAIL` environment variable and set it to your ShipTheory email
- Create a `FOXY_SHIPTHEORY_PASSWORD` environment variable and set it to you ShipTheory password
- Create a `FOXY_WEBHOOK_ENCRYPTION_KEY` environment variable. Let's get it's value from Foxy.
    - Go to your Foxy account, choose your store and click the "integrations" link.
    - Check the 'JSON WEBHOOK' checkbox and **copy the value from "Encryption Key"**
    - If you already have a `JSON WEBHOOK` in place, click the `Add one more URL` button. 
    - This webhook is only using the 'Transaction Created' event. **You may uncheck the others**.
    - Leave this page open, because we will come back to it.
- Go back to your Netlify settings and paste the Encryption key in the `FOXY_WEBHOOK_ENCRYPTION_KEY` environment variable.
- **Save the environment variables in Netlify**

### Configure your Foxy Store Webhook

If you haven't closed your Foxy JSON Webhook integration page, keep it open as it will be needed now.

First, in your app in Netlify (the page you are already if you've just done the previous step), do the following:
- Click on the "Functions" tab of you Netlify app, and then on the "shiptheory" function.
- Copy the "Enpoint" value from there.
- Now go over to your Foxy JSON Webhook integration page and paste it into the **URL** field in the Foxy JSON Webhook.
- **Click `Update Webhooks`**.

From this point on, new Shipments will be created in ShipTheory for each new Foxy transaction.

## Configure your ShipTheory rules

Please notice that you need to connect to a carrier in ShipTheory to be able to handle shipments.

For testings purposes (or if this is enough for your use case) you can create an **"Address Only Labels"** carrier account.

Within ShipTheory, the new shipments created can be found under the "All" tab.
You can create rules to automate what should happen to each shipment.

# Reference

### Environment variables

This section lists all environment variables you can set to configure your webhook.

If new features are added to the webhook you may find new configurations here.

| Evironment variabel           |  Description                                             |
| ----------------------------- |  ------------------------------------------------------- |
| `FOXY_WEBHOOK_ENCRYPTION_KEY`   |  The encryption key used to validate Foxy Signature. You can get it in your Store Admin integration section|
| `FOXY_SHIPTHEORY_EMAIL`         |  The email used to log in to ShipTheory.|
| `FOXY_SHIPTHEORY_PASSWORD`      |  The password used to log in to ShipTheory.|
