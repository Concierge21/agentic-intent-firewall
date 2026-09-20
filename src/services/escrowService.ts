import crypto from 'crypto';
import { logAuditEvent } from './auditLogger';

interface EscrowItem {
  action: string;
  items: any[];
  timeoutId: NodeJS.Timeout;
}

const escrowStore: { [id: string]: EscrowItem } = {};

export const parkTransaction = (action: string, items: any[], intentToken?: string, riskAssessment?: any): string => {
  const transactionId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const timeoutId = setTimeout(() => {
    console.log(`[Escrow Executed] Timer expired for ${transactionId}. Upstream cleared.`);
    logAuditEvent({
      eventType: 'TRANSACTION_EXECUTED',
      transactionId,
      payload: { action, items }
    });
    delete escrowStore[transactionId];
  }, 60000);

  escrowStore[transactionId] = { action, items, timeoutId };

  logAuditEvent({
    eventType: 'CHECKOUT_ESCROWED',
    transactionId,
    intentToken,
    riskAssessment,
    payload: { action, items }
  });

  return transactionId;
};

export const abortTransaction = (transactionId: string): boolean => {
  const transaction = escrowStore[transactionId];
  if (!transaction) return false;

  clearTimeout(transaction.timeoutId);
  delete escrowStore[transactionId];

  logAuditEvent({
    eventType: 'TRANSACTION_ABORTED',
    transactionId,
    payload: { action: transaction.action, items: transaction.items }
  });

  return true;
};