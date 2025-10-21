// logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile) {
    this.logFile = path.resolve(logFile);
  }

  log(msg, type = 'INFO') {
    const line = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
    process.stdout.write(line);
    fs.appendFileSync(this.logFile, line);
  }
}

module.exports = Logger;