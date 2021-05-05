# Foxy Webhook

This module aims to consolidate the interaction with Foxy Webhooks.

- use FoxySDK to validate the Foxy Webhook Signature
- provide default responses

## Webhook validation

The webhook validation is optional and is performed if the
`FOXY_WEBHOOK_ENCRYPTION_KEY` environment variable is set. If it is not set
requests are presumed to be from Foxy.

## Environment variables

These environment variables are used to configure datastore functions.

| Variable                   | Default Value   | Description|
| -------------------------- | --------------- | ------------------- |
| `FOXY_API_CLIENT_ID`         | ""         | **Required** Your Foxy Client Id. | 
| `FOXY_API_CLIENT_SECRET`     | ""         | **Required** Your Foxy Client Secret.|
| `FOXY_API_REFRESH_TOKEN `    | ""         | **Required** Your Foxy Client Refresh Token.|
|`FOXY_WEBHOOK_ENCRYPTION_KEY`|
|`FOXY_ERROR_INSUFFICIENT_INVENTORY`|
|`FOXY_ERROR_PRICE_MISMATCH`|
|`FOXY_FIELD_CODE`|
|`FOXY_FIELD_INVENTORY`|
|`FOXY_FIELD_PRICE`|
|`FOXY_SKIP_INVENTORY_CODES`|
|`FOXY_SKIP_INVENTORY_UPDATE_CODES`|
|`FOXY_SKIP_PRICE_CODES`|
