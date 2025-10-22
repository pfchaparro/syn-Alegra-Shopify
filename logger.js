// logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logDir = './logs') {
    // Asegura que logDir sea una cadena válida
    if (typeof logDir !== 'string' || logDir.trim() === '') {
      logDir = './logs';
    }
    this.logDir = path.resolve(logDir);

    // Crea la carpeta de logs si no existe
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);

    fs.appendFileSync(logFile, logMessage);
    console.log(logMessage.trim()); // También imprime en consola
  }

  info(message) {
    this.log('info', message);
  }

  warn(message) {
    this.log('warn', message);
  }

  error(message) {
    this.log('error', message);
  }
}

module.exports = Logger;