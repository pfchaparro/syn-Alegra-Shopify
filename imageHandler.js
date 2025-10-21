// imageHandler.js
const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const { URL } = require('url');

class ImageHandler {
  constructor(tmpDir) {
    this.tmpDir = path.resolve(tmpDir);
    fs.ensureDirSync(this.tmpDir);
  }

  async downloadAndEncode(url) {
    if (!url) return null;

    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).slice(1) || 'jpg';
    const filename = path.join(this.tmpDir, `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`);

    try {
      const data = await this.downloadFile(url);
      await fs.writeFile(filename, data);
      const encoded = (await fs.readFile(filename)).toString('base64');
      await fs.unlink(filename);
      return encoded;
    } catch (err) {
      console.warn(`No se pudo descargar imagen: ${url}`, err.message);
      return null;
    }
  }

  downloadFile(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }
}

module.exports = ImageHandler;