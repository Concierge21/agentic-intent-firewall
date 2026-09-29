import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'audit.jsonl');

export interface AuditEvent {
  eventType: 'CHECKOUT_ESCROWED' | 'TRANSACTION_EXECUTED' | 'TRANSACTION_ABORTED' | 'CHECKOUT_BLOCKED';
  transactionId: string;
  riskAssessment?: any;
  payload: any;
  timestamp?: string;
}

export function logAuditEvent(event: AuditEvent) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Read last line to get previous hash for chaining
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  if (fs.existsSync(logFile)) {
    const fileContent = fs.readFileSync(logFile, 'utf8').trim();
    if (fileContent) {
      const lines = fileContent.split('\n');
      try {
        const lastRecord = JSON.parse(lines[lines.length - 1]);
        previousHash = lastRecord.currentHash || previousHash;
      } catch (e) {
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
  const currentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(recordBody))
    .digest('hex');

  const finalRecord = {
    ...recordBody,
    currentHash
  };

  fs.appendFileSync(logFile, JSON.stringify(finalRecord) + '\n');
  console.log(`🔒 [Audit Logged] Type: ${event.eventType} | TxID: ${event.transactionId} | Hash: ${currentHash.substring(0, 12)}...`);
}