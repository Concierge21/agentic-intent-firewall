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

const WEBHOOK_URL = 'https://graceful-canyon-46.webhook.cool';

export const logAuditEvent = async (event: AuditEvent): Promise<void> => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const auditRecord = {
      timestamp: new Date().toISOString(),
      ...event
    };

    // 1. Write locally to audit.jsonl
    const logFilePath = path.join(logDir, 'audit.jsonl');
    fs.appendFileSync(logFilePath, JSON.stringify(auditRecord) + '\n', 'utf8');
    console.log(`[Audit Logged] Type: ${event.eventType} ${event.transactionId ? `| ID: ${event.transactionId}` : ''}`);

    // 2. Broadcast live POST request to your Webhook.cool dashboard
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditRecord)
    });
  } catch (err) {
    console.error('[Audit Logger Error] Failed to write log or send webhook:', err);
  }
};