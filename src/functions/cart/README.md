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

### Environment variables

This webhook depends on FoxyAPI and requires setting the following environment variables:

| Variable                   | Default Value   | Description|
| -------------------------- | --------------- | ------------------- |
| `FOXY_API_CLIENT_ID`         | ""         | **Required** Your Foxy Client Id. | 
| `FOXY_API_CLIENT_SECRET`     | ""         | **Required** Your Foxy Client Secret.|
| `FOXY_API_REFRESH_TOKEN `    | ""         | **Required** Your Foxy Client Refresh Token.|
|`FOXY_DEFAULT_AUTOSHIP_FREQUENCY`| "1m" | The default subscription frequency to be used when converting a cart into subscriptions.|


You can grab these values for your store going to your Foxy Store Admin page, click on the "integrations" link and, under "current integrations" click "Get Token".

Then, go to your site's Netlify Dashboard and go to:
- settings > build and deploy > Environment
- click on "Edit variables" and create variables with the keys above and the values from your the integration you created in Foxy Admin.


### Endpoints

This webhook provides you with two endpoints you can use to change your cart into subscriptions or from subscriptions to one off purchases.

| Path                   | Variables | Description|
| -------------------------- | --------------- | ------------------- |
| `{cartId}/convert/recurring/{frequency}` | cartId, frequency         | Converts all items from the cart into subscription items. Items that are already subscriptions are left unchanged. The subscription frequency must follow the same patter as the `sub_frequency`. [Check the documentation here](https://wiki.foxycart.com/v/2.0/products#subscription_product_options).| 
| `{cartId}/convert/nonrecurring`     | cartId         | Converts all items from the cart into regular purchases.|


## Usage

To use this Webhook you'll need to:

- create a button or other interface for the user to choose to convert the items into a subscription;
- grab the cart id from the `FC` object;
- fetch the one of the available endpoints;
- use the result to allow your user to know that it worked or failed

#### Add the loader.js to your page

- Go to your store admin page and under "STORE", click [sample code (or use this link if you're logged in.)](https://admin.foxycart.com/admin.php?ThisAction=SampleCode).
- You need to do the STEP 1 in the sample code section.

#### Grab the cart id

The cart id must be passed as a URL parameter to either endpoint.

Within your `FC` object you will find the cart id in `FC.json.transaction_id`.

### Example

The code bellow is a simple usage example:

       <html>
          <head>
            <title>My Vanilla Foxy Store</title>
            <link rel="stylesheet" href="https://unpkg.com/mvp.css">
          </head>
          <body>
            <header>
              <nav>
                <h1>My Vanilla Foxy Store</h1>
                <ul>
                  <li><a href="https://mystore.foxycart.com/cart?cart=view">View the Cart</a></li>
                  <li><a href="#" onclick="convertCartToSub()">Convert to subscription</a></li>
                  <li><a href="#" onclick="convertCartToOneOff()">Convert to One Time Purchase</a></li>
                </ul>
                <sup id="success" hidden="true" >Success!</sup>
              </nav>
            </header>
            <main>
              <p>This cart demonstrate how to use the Cart webhook to convert a given cart into subscriptions and vice-versa.</p>
              <section id="store">
                <form action="https://mystore.foxycart.com/cart" method="post" accept-charset="utf-8">
                  <p>A cool example product!</p>
                  <input type="hidden" name="name" value="Cool Example" />
                  <input type="hidden" name="price" value="10" />
                  <input type="hidden" name="code" value="sku123" />
                  <label class="label_left">Size</label>
                  <select name="size">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  <input type="submit" value="Add a Cool Example" class="submit" />
                </form>
              </section>
            </main>
            <section>
              <p data-fc-id="minicart">
              <a href="https://mystore.foxycart.com/cart?cart=view">
                <span data-fc-id="minicart-quantity">0</span>
                <span data-fc-id="minicart-singular"> item </span>
                <span data-fc-id="minicart-plural"> items </span>
                in cart. Total cost: $
                <span data-fc-id="minicart-order-total">0</span>
              </a>
              </p>
            </section>


            <script>
              const item2subURL = 'http://localhost:8888/.netlify/functions/cart';
              function success() {
                      document.querySelector('#success').hidden = false;
                      setTimeout(function() {
                              document.querySelector('#success').hidden = true;
                            }, 3000
                              );
                    }
              function convertCartToOneOff() {
                      const webhookURL = `${item2subURL}/${FC.json.transaction_id}/convert/nonrecurring`;
                      fetch(webhookURL).then(r => {
                              if (r.status == 200) {
                                      success();
                                    }
                              console.debug(r)
                              });
                    }
              function convertCartToSub() {
                      const webhookURL = `${item2subURL}/${FC.json.transaction_id}/convert/recurring/1m`;
                      fetch(webhookURL).then(r => {
                              if (r.status == 200) {
                                      success();
                                    }
                              console.debug(r)
                            });
                    }
            </script>

            <script data-cfasync="false" src="https://cdn.foxycart.com/mystore/loader.js" async defer></script>
          </body>
        </html> 
