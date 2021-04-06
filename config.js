/**
 * @file Manages the configuration settings
 */

/**
 * @param {string} envVar the environment variable to get
 * @returns {string} the environment variable value
 */
function env(envVar) {
  return process.env[envVar];
}

module.exports = {
  default: {
    autoshipFrequency: env('DEFAULT_AUTOSHIP_FREQUENCY')
  },
  foxy: {
    api: {
      clientId: env('FOXY_API_CLIENT_ID'),
      clientSecret: env('FOXY_API_CLIENT_SECRET'),
      refreshToken: env('FOXY_API_REFRESH_TOKEN')
    },
    webhook: {
      encryptionKey: env('FOXY_WEBHOOK_ENCRYPTION_KEY'),
      encryptionKey: env('FOXY_ENCRYPTION_KEY')
    }
  },
  idev: {
    apiUrl: env('IDEV_API_URL'),
    secretKey: env('IDEV_SECRET_KEY'),
  },
  datastore: {
    field: {
      code: env('FX_FIELD_CODE'),
      inventory: env('FX_FIELD_INVENTORY'),
      price: env('FX_FIELD_PRICE'),
    },
    skipCode: {
      inventory: env('FX_SKIP_INVENTORY_CODES'),
      price: env('FX_SKIP_PRICE_CODES'),
    },
    error: {
      insufficientInventory: env('FX_ERROR_INSUFFICIENT_INVENTORY'),
      priceMismatch: env('FX_ERROR_PRICE_MISMATCH')
    },
    provider: {
      webflow: {
        token: env('WEBFLOW_TOKEN'),
      },
      orderDesk: {
        apiKey: env("ORDERDESK_API_KEY"),
        storeId: env("ORDERDESK_STORE_ID")
      }
    }
  },
}
