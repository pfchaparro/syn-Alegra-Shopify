// config.js

module.exports = {
  logFile: process.env.LOG_FILE || './logs/app.log',
  tmpDir: process.env.TMP_DIR || './tmp',
  OpenAI: process.env.OPENAI_API_KEY,

  shopify: {
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-10'
  },

  alegra: {
    apiKey: process.env.ALEGRA_API_KEY,
    user: process.env.ALEGRA_USER_EMAIL,
    apiUrl: process.env.ALEGRA_URL,
  }
};