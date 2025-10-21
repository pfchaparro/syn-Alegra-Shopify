// shopifyClient.js
const axios = require('axios');
const config = require('./config');

class ShopifyClient {
    constructor(logger) {
        this.logger = logger;
        this.baseURL = `https://${config.shopify.domain}/admin/api/2025-01`;
        this.headers = {
            'X-Shopify-Access-Token': config.shopify.token,
            'Content-Type': 'application/json'
        };
    }

    async getLocationId() {
        try {
            const res = await axios.get(`${this.baseURL}/locations.json`, { headers: this.headers });
            const id = res.data.locations[0]?.id;
            if (id) {
                this.logger.log(`Ubicación encontrada: ID ${id}`);
                return id;
            }
        } catch (err) {
            this.logger.log(`Error al obtener location_id: ${err.message}`, 'ERROR');
        }
        return null;
    }

    async getAllProducts() {
        const skus = {};
        let url = `${this.baseURL}/products.json?limit=250&fields=id,variants`;

        do {
            try {
                const res = await axios.get(url, { headers: this.headers });
                const { products } = res.data;

                for (const p of products) {
                    for (const v of p.variants) {
                        if (v.sku) {
                            skus[v.sku] = {
                                product_id: p.id,
                                variant_id: v.id,
                                inventory_item_id: v.inventory_item_id
                            };
                        }
                    }
                }

                this.logger.log(`Shopify: recuperados ${Object.keys(skus).length} SKUs`);
                const linkHeader = res.headers.link;
                url = null;
                if (linkHeader) {
                    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                    if (nextMatch) url = nextMatch[1];
                }
            } catch (err) {
                this.logger.log(`Error al obtener productos de Shopify: ${err.message}`, 'ERROR');
                break;
            }
        } while (url);

        return skus;
    }

    async createOrUpdateProduct(data, productId = null) {
        const url = productId
            ? `${this.baseURL}/products/${productId}.json`
            : `${this.baseURL}/products.json`;
        const method = productId ? 'put' : 'post';
        return axios[method](url, data, { headers: this.headers });
    }

    async updateInventory(locationId, inventoryItemId, available) {
        const data = { location_id: locationId, inventory_item_id: inventoryItemId, available };
        return axios.post(`${this.baseURL}/inventory_levels/set.json`, data, { headers: this.headers });
    }

    async getCollectionsMap() {
        const collections = {};

        // Smart collections (automáticas)
        let url = `${this.baseURL}/smart_collections.json?limit=250`;
        do {
            const res = await axios.get(url, { headers: this.headers });
            for (const col of res.data.smart_collections) {
                collections[col.title] = col.id;
            }
            const linkHeader = res.headers.link;
            url = null;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (nextMatch) url = nextMatch[1];
            }
        } while (url);

        // Custom collections (manuales)
        url = `${this.baseURL}/custom_collections.json?limit=250`;
        do {
            const res = await axios.get(url, { headers: this.headers });
            for (const col of res.data.custom_collections) {
                collections[col.title] = col.id;
            }
            const linkHeader = res.headers.link;
            url = null;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (nextMatch) url = nextMatch[1];
            }
        } while (url);

        return collections;
    }

    // En ShopifyClient.js

    async assignCollectionsToProduct(productId, collectionIds) {
        // 1. Eliminar collects existentes
        const collectsRes = await axios.get(
            `${this.baseURL}/collects.json?product_id=${productId}`,
            { headers: this.headers }
        );
        for (const collect of collectsRes.data.collects) {
            await axios.delete(`${this.baseURL}/collects/${collect.id}.json`, { headers: this.headers });
        }

        // 2. Crear nuevos collects
        for (const collectionId of collectionIds) {
            const data = { collect: { product_id: productId, collection_id: collectionId } };
            await axios.post(`${this.baseURL}/collects.json`, data, { headers: this.headers });
        }
    }
}

module.exports = ShopifyClient;