// src/middleware/auditLogger.js
const fs = require('fs');
const path = require('path');

function auditLogger(req, res, next) {
    const startTime = Date.now();

    // Listen for the response to finish so we can log the final status code
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            endpoint: req.originalUrl,
            intentToken: req.headers['x-aif-intent-token'] ? 'PRESENT' : 'MISSING',
            userAgent: req.get('user-agent') || 'unknown',
            statusCode: res.statusCode,
            responseTimeMs: duration
        };

        // Ensure the logs directory exists
        const logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Append log entry as a structured JSON line
        const logFile = path.join(logDir, 'audit.log');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    });

    next();
}

module.exports = { auditLogger };