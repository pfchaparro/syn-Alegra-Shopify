// AlegraClient.js
const axios = require('axios');
const config = require('./config');

class AlegraClient {
  constructor(logger) {
    this.logger = logger;

    if (!config.alegra.user || !config.alegra.apiKey) {
      throw new Error('Faltan ALEGRA_USER_EMAIL o ALEGRA_API_KEY en .env');
    }

    this.auth = Buffer.from(`${config.alegra.user}:${config.alegra.apiKey}`).toString('base64');

    this.remaining = 150;
    this.resetTime = Date.now() + 60000;
  }

  async getAllActiveProducts() {
    const products = [];
    let start = 0;
    const limit = 30;

    do {
      // Esperar si no hay créditos de tasa disponibles
      const now = Date.now();
      if (this.remaining <= 1 && now < this.resetTime) {
        const waitMs = this.resetTime - now;
        this.logger.log(`⏳ Esperando ${Math.ceil(waitMs / 1000)} segundos para respetar límite de Alegra...`);
        await new Promise(r => setTimeout(r, waitMs));
      }

      const params = new URLSearchParams({
        start,
        limit,
        order_field: 'id',
        order_direction: 'ASC',
        mode: 'advanced'
      });

      try {
        const res = await axios.get(`${config.alegra.apiUrl}?${params}`, {
          headers: { Authorization: `Basic ${this.auth}` }
        });

        // Leer headers de tasa
        this.remaining = parseInt(res.headers['x-rate-limit-remaining'] || '150', 10);
        const resetSeconds = parseInt(res.headers['x-rate-limit-reset'] || '60', 10);
        this.resetTime = Date.now() + resetSeconds * 1000;

        const page = res.data;
        if (!Array.isArray(page)) {
          this.logger.log('Respuesta de Alegra no es un arreglo. Deteniendo.', 'ERROR');
          break;
        }

        // Filtrar solo productos activos
        const active = page.filter(p => p.status === 'active');
        products.push(...active);

        this.logger.log(`Alegra: recuperados ${products.length} productos activos`);
        if (page.length < limit) break;
        start += limit;

      } catch (err) {
        if (err.response?.status === 429) {
          this.logger.log('⚠️ Límite de tasa excedido. Esperando 60 segundos...', 'ERROR');
          await new Promise(r => setTimeout(r, 60000));
          continue; // Reintentar la misma página
        }
        this.logger.log(`Error en Alegra: ${err.message}`, 'ERROR');
        break;
      }
    } while (true);

    return products;
  }
}

module.exports = AlegraClient;