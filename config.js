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

const config = {
  datastore: {
    error: {
      insufficientInventory:
        env("FOXY_ERROR_INSUFFICIENT_INVENTORY") ||
        env("FX_ERROR_INSUFFICIENT_INVENTORY"),
      priceMismatch:
        env("FOXY_ERROR_PRICE_MISMATCH") || env("FX_ERROR_PRICE_MISMATCH"),
    },
    field: {
      code: env("FOXY_FIELD_CODE") || env("FX_FIELD_CODE"),
      inventory: env("FOXY_FIELD_INVENTORY") || env("FX_FIELD_INVENTORY"),
      price: env("FOXY_FIELD_PRICE") || env("FX_FIELD_PRICE"),
    },
    provider: {
      orderDesk: {
        apiKey: env("FOXY_ORDERDESK_API_KEY"),
        storeId: env("FOXY_ORDERDESK_STORE_ID"),
      },
      webflow: {
        collection: env('FOXY_WEBFLOW_COLLECTION'),
        token: env('FOXY_WEBFLOW_TOKEN') || env('WEBFLOW_TOKEN'),
      },
      wix: {
        accountId: env("FOXY_WIX_ACCOUNT_ID"),
        apiKey: env("FOXY_WIX_API_KEY"),
        siteId: env("FOXY_WIX_SITE_ID"),
      }
    },
    skipUpdate: {
      inventory: env("FOXY_SKIP_INVENTORY_UPDATE_CODES"),
    },
    skipValidation: {
      inventory:
        env("FOXY_SKIP_INVENTORY_CODES") || env("FX_SKIP_INVENTORY_CODES"),
      price: env("FOXY_SKIP_PRICE_CODES") || env("FX_SKIP_PRICE_CODES"),
      updateinfo: env("FOXY_SKIP_UPDATEINFO_NAME"),
    },
  },
  default: {
    autoshipFrequency:
      env("FOXY_DEFAULT_AUTOSHIP_FREQUENCY") ||
      env("DEFAULT_AUTOSHIP_FREQUENCY"),
  },
  foxy: {
    api: {
      clientId: env("FOXY_API_CLIENT_ID"),
      clientSecret: env("FOXY_API_CLIENT_SECRET"),
      refreshToken: env("FOXY_API_REFRESH_TOKEN"),
    },
    webhook: {
      encryptionKey: env("FOXY_WEBHOOK_ENCRYPTION_KEY"),
    },
  },
  idevAffiliate: {
    apiUrl: env("FOXY_IDEV_API_URL") || env("IDEV_API_URL"),
    secretKey: env("FOXY_IDEV_SECRET_KEY") || env("IDEV_SECRET_KEY"),
  },
  lune: {
    apiKey: env("LUNE_API_KEY"),
  },
  vatlayer: {
    accessKey: env("VATLAYER_ACCESS_KEY"),
  },
};

module.exports = {
  config,
};
