# ShipTheory

This integration allows you to create shipments in ShipTheory for Foxy.io transactions.

## How to use it

- Deploy this repository to your Netlify account.
- Set the environment variables
- Grab the function URL
- Configure your Foxy Store to use that URL

You will also need to configure your SipTheory rules.

# Reference

### Environment variables

| Evironment variabel           |  Description                                             |
| ----------------------------- |  ------------------------------------------------------- |
| FOXY_WEBHOOK_ENCRYPTION_KEY   |  The encryption key used to validate Foxy Signature. You can get it in your Store Admin integration section|
| FOXY_SHIPTHEORY_EMAIL         |  The email used to log in to ShipTheory.|
| FOXY_SHIPTHEORY_PASSWORD      |  The password used to log in to ShipTheory.|
