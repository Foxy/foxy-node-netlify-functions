# Cart webhook

This webhook allows you to convert regular items from an existing cart into subscriptions and vice-versa.

Your customer may be buying a magazine, but may choose to change this purchase into a subscription, for example.

**Note:** you'll need some client-side Javascript code to use this webhook. We provide an example, but you'll certainly need to customize it to your needs.

## Setup

### Deploy

The first step is to deploy this repository to Netlify. If you are using other
functions from this repository you don't need to do this step.

1. Clone this repository.
1. Go to Netlify and click `New site from Git`.
1. Choose the repository you've just cloned.

### Configuration

This webhook depends on FoxyAPI and requires setting the following environment variables:

| Variable                   | Default Value   | Description|
| -------------------------- | --------------- | ------------------- |
| FOXY_API_CLIENT_ID         | ""         | **Required** Your Foxy Client Id. | 
| FOXY_API_CLIENT_SECRET     | ""         | **Required** Your Foxy Client Secret.|
| FOXY_API_REFRESH_TOKEN     | ""         | **Required** Your Foxy Client Refresh Token.|


You can grab these values for your store going to your Foxy Store Admin page, click on the "integrations" link and, under "current integrations" click "Get Token".

Then, go to your site's Netlify Dashboard and go to:
- settings > build and deploy > Environment
- click on "Edit variables" and create variables with the keys above and the values from your the integration you created in Foxy Admin.

## Usage




