"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const WEBHOOK_URL = 'https://graceful-canyon-46.webhook.cool';
const logDir = path_1.default.join(process.cwd(), 'logs');
const logFilePath = path_1.default.join(logDir, 'audit.jsonl');
// Helper to grab the previous block's hash to chain them together
function getLastHash() {
    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    if (!fs_1.default.existsSync(logFilePath))
        return genesisHash;
    const fileContent = fs_1.default.readFileSync(logFilePath, 'utf-8').trim();
    if (!fileContent)
        return genesisHash;
    const lines = fileContent.split('\n');
    const lastLine = lines[lines.length - 1];
    try {
        const lastLog = JSON.parse(lastLine);
        return lastLog.currentHash || genesisHash;
    }
    catch {
        return genesisHash;
    }
}
const logAuditEvent = async (event) => {
    try {
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        const previousHash = getLastHash();
        const timestamp = new Date().toISOString();
        // 1. Build the base log entry
        const logEntry = {
            timestamp,
            ...event,
            previousHash
        };
        // 2. Hash the entry (SHA-256) for tamper-proofing
        const logString = JSON.stringify(logEntry);
        const currentHash = crypto_1.default.createHash('sha256').update(logString).digest('hex');
        // 3. Attach the current hash
        const finalRecord = { ...logEntry, currentHash };
        // 4. Write locally to audit.jsonl (Cryptographically Chained)
        fs_1.default.appendFileSync(logFilePath, JSON.stringify(finalRecord) + '\n', 'utf8');
        console.log(`🔒 [Audit Logged] Type: ${event.eventType} ${event.transactionId ? `| ID: ${event.transactionId}` : ''} | Hash: ${currentHash.substring(0, 10)}...`);
        // 5. Broadcast live POST request to your Webhook.cool dashboard
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalRecord)
        });
    }
    catch (err) {
        console.error('[Audit Logger Error] Failed to write log or send webhook:', err);
    }
};
exports.logAuditEvent = logAuditEvent;
