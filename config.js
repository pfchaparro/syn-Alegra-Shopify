// config.js
require('dotenv').config(); // Carga las variables de .env

module.exports = {
  shopify: {
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-10'
  },
  alegra: {
    apiKey: process.env.ALEGRA_API_KEY,
    user: process.env.ALEGRA_USER_EMAIL
  }
};