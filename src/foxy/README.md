# Foxy Webhook

This module aims to consolidate the interaction with Foxy Webhooks.

- use FoxySDK to validate the Foxy Webhook Signature
- provide default responses

## Webhook validation

The webhook validation is optional and is performed if the
`FOXY_WEBHOOK_ENCRYPTION_KEY` environment variable is set. If it is not set
requests are presumed to be from Foxy.


