import { logAuditEvent } from './auditLogger';

export type EscrowState = 'PENDING' | 'ESCROWED' | 'EXECUTED' | 'DENIED' | 'ABORTED' | 'EXPIRED';

export interface EscrowTransaction {
  id: string;
  state: EscrowState;
  payload: any;
  riskAssessment: any;
  createdAt: number;
  expiresAt: number;
  timer?: NodeJS.Timeout;
}

class EscrowStateMachine {
  private transactions = new Map<string, EscrowTransaction>();

  public create(id: string, payload: any, riskAssessment: any, ttlSeconds: number = 30): EscrowTransaction {
    const createdAt = Date.now();
    const expiresAt = createdAt + (ttlSeconds * 1000);

    const transaction: EscrowTransaction = {
      id,
      state: 'ESCROWED',
      payload,
      riskAssessment,
      createdAt,
      expiresAt
    };

    transaction.timer = setTimeout(() => {
      this.expire(id);
    }, ttlSeconds * 1000);

    this.transactions.set(id, transaction);
    return transaction;
  }

  public get(id: string): EscrowTransaction | undefined {
    return this.transactions.get(id);
  }

  public getAll(): EscrowTransaction[] {
    return Array.from(this.transactions.values()).filter(t => t.state === 'ESCROWED');
  }

  public transition(id: string, targetState: EscrowState): EscrowTransaction | null {
    const txn = this.transactions.get(id);
    if (!txn || txn.state !== 'ESCROWED') {
      return null;
    }

    if (txn.timer) {
      clearTimeout(txn.timer);
    }

    txn.state = targetState;
    this.transactions.delete(id);
    return txn;
  }

  private expire(id: string) {
    const txn = this.transactions.get(id);
    if (txn && txn.state === 'ESCROWED') {
      txn.state = 'EXPIRED';
      console.log(`⏰ [Escrow Machine] Transaction ${id} expired automatically after TTL.`);
      
      logAuditEvent({
        eventType: 'CHECKOUT_BLOCKED',
        transactionId: id,
        riskAssessment: txn.riskAssessment,
        payload: txn.payload
      });

      this.transactions.delete(id);
    }
  }
}

export const escrowManager = new EscrowStateMachine();