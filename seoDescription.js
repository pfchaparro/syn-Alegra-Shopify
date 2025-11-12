// seoDescription.js
const { OpenAI } = require('openai');

let openai = null;

function initOpenAI(apiKey) {
    if (!openai && apiKey) {
        openai = new OpenAI({ apiKey });
    }
}

async function generarDescripcionSEO(producto) {
    if (!openai) {
        console.warn('⚠️ OpenAI no inicializado. No se generará descripción SEO.');
        return null;
    }

    const nombre = producto.name || 'Producto para mascotas';
    const categoria = producto.itemCategory?.name || 'producto';
    const marca = producto.customFields
        ? producto.customFields.find(f => f.name === 'marca')?.value
        : 'marca';
    const iva = producto.tax?.[0]?.percentage || '19.00';

    const prompt = `
Escribe una descripción comercial original, atractiva y optimizada para SEO en español (Colombia) para el siguiente producto:

- Nombre: ${nombre}
- Categoría: ${categoria}
- Marca: ${marca}
- IVA: ${iva}% (incluido en el precio)

La descripción debe:
- Tener entre 120 y 160 palabras.
- Incluir palabras clave naturales relacionadas con mascotas, la categoría y la marca.
- Ser única (no copiada).
- Ser útil para dueños de mascotas en Colombia.
- No mencionar precios ni promociones.
- Terminar con un llamado a la acción suave.
- No incluir HTML, solo texto plano.
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 250
        });
        return completion.choices[0].message.content.trim();
    } catch (err) {
        console.error('❌ Error al generar descripción SEO:', err.message);
        return null;
    }
}

module.exports = { initOpenAI, generarDescripcionSEO };