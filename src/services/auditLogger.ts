import fs from 'fs';
import path from 'path';

export interface AuditEvent {
  eventType: 'CHECKOUT_BLOCKED' | 'CHECKOUT_ESCROWED' | 'TRANSACTION_ABORTED' | 'TRANSACTION_EXECUTED';
  transactionId?: string;
  intentToken?: string;
  riskAssessment?: {
    score: number;
    level: string;
    flags: string[];
  };
  payload?: any;
}

export const logAuditEvent = (event: AuditEvent): void => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const auditRecord = {
      timestamp: new Date().toISOString(),
      ...event
    };

    const logFilePath = path.join(logDir, 'audit.jsonl');
    fs.appendFileSync(logFilePath, JSON.stringify(auditRecord) + '\n', 'utf8');
    console.log(`[Audit Logged] Type: ${event.eventType} ${event.transactionId ? `| ID: ${event.transactionId}` : ''}`);
  } catch (err) {
    console.error('[Audit Logger Error] Failed to write log:', err);
  }
};