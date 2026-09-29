"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const logDir = path_1.default.join(process.cwd(), 'logs');
const logFile = path_1.default.join(logDir, 'audit.jsonl');
function logAuditEvent(event) {
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    // Read last line to get previous hash for chaining
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    if (fs_1.default.existsSync(logFile)) {
        const fileContent = fs_1.default.readFileSync(logFile, 'utf8').trim();
        if (fileContent) {
            const lines = fileContent.split('\n');
            try {
                const lastRecord = JSON.parse(lines[lines.length - 1]);
                previousHash = lastRecord.currentHash || previousHash;
            }
            catch (e) {
                // Fallback if file parsing fails
            }
        }
    }
    const timestamp = new Date().toISOString();
    const recordBody = {
        timestamp,
        eventType: event.eventType,
        transactionId: event.transactionId,
        riskAssessment: event.riskAssessment || null,
        payload: event.payload,
        previousHash
    };
    // Generate SHA-256 cryptographic hash of this record + previous hash
    const currentHash = crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(recordBody))
        .digest('hex');
    const finalRecord = {
        ...recordBody,
        currentHash
    };
    fs_1.default.appendFileSync(logFile, JSON.stringify(finalRecord) + '\n');
    console.log(`🔒 [Audit Logged] Type: ${event.eventType} | TxID: ${event.transactionId} | Hash: ${currentHash.substring(0, 12)}...`);
}
