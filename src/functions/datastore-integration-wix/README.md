# Pre-checkout webhook for Wix-Foxy

This pre-checkout webhook provides security against HTML modifications on your Wix site. It is triggered when a Foxy checkout request is submitted and validates all items in cart to ensure they have sufficient inventory and matched pricing in your Wix store.

It requires using Wix Stores to manage products and integrating with Foxy by following [this tutorial](https://foxy.io/help/articles/use-wix-stores-to-manage-foxy-products).

## Usage

### Get Wix API and account credentials

#### Wix API Key

1. Go to [Wix API Keys Manager](https://manage.wix.com/account/api-keys)
2. Click the **Generate API Key** button
3. Enter a name for the API key
4. For Permissions, expand All site permissions by clicking the **See all** button
5. Check the checkbox for **Wix Stores**
6. Click the **Generate Key** button
7. Copy the API key token and store it somewhere safe

#### Wix Account ID

After generating an API key, in your [Wix API Keys Manager](https://manage.wix.com/account/api-keys), you should see your Wix account ID on the right.

#### Wix Site ID

1. Go to your Wix dashboard and select your site
2. Get the site ID from the URL, which appears after `/dashboard/` in the URL:
   ![](https://wixmp-833713b177cebf373f611808.wixmp.com/images/about-api-keys-md_media_siteid.png)

### Deploy this repository to Netlify

1. Click the **Fork** button at the top right corner of this page
2. Go to [Netlify](https://www.netlify.com/) and log in your account
3. Add a new site and select the **Import an existing project** option
4. Connect your GitHub account
5. Select repository `foxy-node-netlify-functions`
6. On the review configuration page, under the Environment variables section, click the **Add environment variables** button to add the following variables:
   | Key | Value |
   | ----------- | ----------- |
   | FOXY_WIX_API_KEY | Your Wix API key token |
   | FOXY_WIX_ACCOUNT_ID | Your Wix account ID |
   | FOXY_WIX_SITE_ID | Your Wix site ID |
7. Click the **Deploy foxy-node-netlify-functions** button

### Configure the pre-checkout webhook in Foxy

1. After the site is deployed successfully on Netlify, click **Logs** > **Functions** from the navigation bar on the left
2. Choose the `datastore-integration-wix` function from the list
3. On the function logs page, copy the endpoint URL
4. Log in your [Foxy Admin](https://admin.foxy.io/)
5. Go to **Settings** > **Payments** and choose the payment set that the pre-checkout webhook should be applied to
6. Click the **Add fraud protection** button and choose **Pre-Checkout Webhook**
7. Toggle **Enabled**
8. In the **URL** field, paste the Netlify function endpoint URL from step 3
9. Select an option for the Failure handling setting
10. Click the **Add fraud protection** button
11. Run some test transactions to ensure the pre-checkout webhook is configured correctly
