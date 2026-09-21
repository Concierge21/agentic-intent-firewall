"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const WEBHOOK_URL = 'https://graceful-canyon-46.webhook.cool';
const logAuditEvent = async (event) => {
    try {
        const logDir = path_1.default.join(process.cwd(), 'logs');
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        const auditRecord = {
            timestamp: new Date().toISOString(),
            ...event
        };
        // 1. Write locally to audit.jsonl
        const logFilePath = path_1.default.join(logDir, 'audit.jsonl');
        fs_1.default.appendFileSync(logFilePath, JSON.stringify(auditRecord) + '\n', 'utf8');
        console.log(`[Audit Logged] Type: ${event.eventType} ${event.transactionId ? `| ID: ${event.transactionId}` : ''}`);
        // 2. Broadcast live POST request to your Webhook.cool dashboard
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auditRecord)
        });
    }
    catch (err) {
        console.error('[Audit Logger Error] Failed to write log or send webhook:', err);
    }
};
exports.logAuditEvent = logAuditEvent;
