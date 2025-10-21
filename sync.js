// sync.js
const Logger = require('./logger');
const ImageHandler = require('./imageHandler');
const AlegraClient = require('./alegraClient');
const ShopifyClient = require('./shopifyClient');
const config = require('./config');

// === FUNCION AUXILIAR: obtener valor de custom field ===
function getCustomFieldValue(customFields, fieldName) {
    if (!Array.isArray(customFields)) return null;
    const field = customFields.find(f => f.name === fieldName);
    return field ? field.value : null;
}

async function main() {
    const logger = new Logger(config.logFile);
    const imageHandler = new ImageHandler(config.tmpDir);
    const alegra = new AlegraClient(logger);
    const shopify = new ShopifyClient(logger);

    logger.log('=== INICIO DE SINCRONIZACIÓN ALEGRA → SHOPIFY ===');

    const locationId = await shopify.getLocationId();
    if (!locationId) {
        logger.log('Sincronización abortada: no se obtuvo location_id', 'FATAL');
        process.exit(1);
    }

    const collectionsMap = await shopify.getCollectionsMap();
    const shopifySkus = await shopify.getAllProducts();
    const alegraProducts = await alegra.getAllActiveProducts();

    for (const p of alegraProducts) {
        // ✅ Solo productos activos
        if (p.status !== 'active') continue;

        // ✅ Solo si tienda_online = true
        const tiendaOnline = getCustomFieldValue(p.customFields, 'tienda_online');
        if (tiendaOnline !== true) continue;

        // ✅ Debe tener SKU
        const sku = p.reference?.trim();
        if (!sku) continue;

        // === CÁLCULO DE PRECIO CON IVA ===
        let rawPrice = 0;
        if (Array.isArray(p.price)) {
            const mainPrice = p.price.find(item => item.main === true);
            if (mainPrice?.price) rawPrice = parseFloat(mainPrice.price);
        }

        let ivaPercent = '0.00';
        if (Array.isArray(p.tax)) {
            const ivaTax = p.tax.find(t => t.type === 'IVA' && t.status === 'active');
            if (ivaTax?.percentage) ivaPercent = ivaTax.percentage;
        }

        const ivaNum = parseFloat(ivaPercent);
        const precioFinal = Math.round(rawPrice * (1 + ivaNum / 100));

        const inventory = parseInt(p.inventory?.availableQuantity || 0);
        const imageUrl = p.images?.[0]?.url || null;

        // === CONSTRUIR VARIANT ===
        const variantData = {
            sku,
            price: precioFinal.toString(),
            inventory_management: 'shopify',
            inventory_policy: 'deny'
        };

        if (shopifySkus[sku]) {
            variantData.id = shopifySkus[sku].variant_id;
        }

        // === DETERMINAR COLECCIONES (solo si ya existen en Shopify) ===
        const collections = [];

        // a) Por customFields.categorias
        const customCategory = getCustomFieldValue(p.customFields, 'categorias');
        if (customCategory && collectionsMap[customCategory]) {
            collections.push(collectionsMap[customCategory]);
        }

        // b) Por customFields.marca
        const marca = getCustomFieldValue(p.customFields, 'marca');
        if (marca && collectionsMap[marca]) {
            collections.push(collectionsMap[marca]);
        }

        // c) Por itemCategory.name
        if (p.itemCategory?.name) {
            const itemCatName = p.itemCategory.name.trim();
            if (itemCatName && collectionsMap[itemCatName]) {
                collections.push(collectionsMap[itemCatName]);
            }
        }

        const uniqueCollections = [...new Set(collections)];

        // === CONSTRUIR PRODUCTO ===
        const productData = {
            product: {
                title: (p.name || 'Producto sin nombre').trim(),
                variants: [variantData],
                published: true,
                published_scope: 'web'
            }
        };

        // === IMAGEN ===
        if (imageUrl) {
            const encoded = await imageHandler.downloadAndEncode(imageUrl);
            if (encoded) {
                productData.product.images = [{ attachment: encoded }];
            }
        }

        // === CREAR/ACTUALIZAR ===
        try {
            let res;
            if (shopifySkus[sku]) {
                res = await shopify.createOrUpdateProduct(productData, shopifySkus[sku].product_id);
            } else {
                res = await shopify.createOrUpdateProduct(productData);
            }

            const productId = res.data.product.id;
            const invItemId = res.data.product.variants[0].inventory_item_id;

            // Actualizar inventario
            if (invItemId) {
                await shopify.updateInventory(locationId, invItemId, inventory);
            }

            // Asignar a colecciones
            if (uniqueCollections.length > 0) {
                await shopify.assignCollectionsToProduct(productId, uniqueCollections);
            }

            logger.log(`✅ Sincronizado: ${p.name} (SKU: ${sku}, Precio: $${precioFinal}, Stock: ${inventory})`);

        } catch (err) {
            logger.log(`❌ Error al procesar '${p.name}' (SKU: ${sku}): ${err.message}`, 'ERROR');
        }
    }

    logger.log('=== SINCRONIZACIÓN FINALIZADA ===');
}

main().catch(console.error);