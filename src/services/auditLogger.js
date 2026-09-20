"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logAuditEvent = (event) => {
    try {
        const logDir = path_1.default.join(process.cwd(), 'logs');
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        const auditRecord = {
            timestamp: new Date().toISOString(),
            ...event
        };
        const logFilePath = path_1.default.join(logDir, 'audit.jsonl');
        fs_1.default.appendFileSync(logFilePath, JSON.stringify(auditRecord) + '\n', 'utf8');
        console.log(`[Audit Logged] Type: ${event.eventType} ${event.transactionId ? `| ID: ${event.transactionId}` : ''}`);
    }
    catch (err) {
        console.error('[Audit Logger Error] Failed to write log:', err);
    }
};
exports.logAuditEvent = logAuditEvent;
