export type EscrowState = 'RECEIVED' | 'ESCROW_HOLD' | 'CLEARED' | 'ABORTED';

export interface EscrowTransaction {
  transactionId: string;
  payload: any;
  assessment?: any;
  expiresAt: number;
  status: EscrowState;
  createdAt?: number;
}

const escrowBuffer = new Map<string, EscrowTransaction>();

export const holdTransaction = (transactionId: string, payload: any, holdTimeMs: number = 30000): void => {
  escrowBuffer.set(transactionId, {
    transactionId,
    payload,
    expiresAt: Date.now() + holdTimeMs,
    status: 'ESCROW_HOLD',
    createdAt: Date.now(),
  });
  console.log(`⏸️ [Escrow] Transaction ${transactionId} held in ESCROW_HOLD state.`);
};

// Compatibility wrapper for server.ts storeHold calls
export const storeHold = (hold: { transactionId: string; payload: any; assessment?: any; status?: string; createdAt?: number }): void => {
  escrowBuffer.set(hold.transactionId, {
    transactionId: hold.transactionId,
    payload: hold.payload,
    assessment: hold.assessment,
    expiresAt: Date.now() + 30000,
    status: 'ESCROW_HOLD',
    createdAt: hold.createdAt || Date.now(),
  });
  console.log(`⏸️ [Escrow] Transaction ${hold.transactionId} stored in ESCROW_HOLD state.`);
};

export const resolveTransaction = (transactionId: string, action: 'CLEAR' | 'ABORT'): boolean => {
  const tx = escrowBuffer.get(transactionId);
  
  // Prevent modifying transactions that are already cleared, aborted, or missing
  if (!tx || tx.status !== 'ESCROW_HOLD') {
      console.log(`⚠️ [Escrow] Cannot ${action} transaction ${transactionId}. Current status: ${tx?.status || 'NOT_FOUND'}`);
      return false;
  }

  tx.status = action === 'CLEAR' ? 'CLEARED' : 'ABORTED';
  console.log(`✅ [Escrow] Transaction ${transactionId} transitioned to ${tx.status}.`);
  return true;
};

export const getTransaction = (transactionId: string): EscrowTransaction | undefined => {
  return escrowBuffer.get(transactionId);
};

export const getAllHolds = (): EscrowTransaction[] => {
  return Array.from(escrowBuffer.values()).filter(tx => tx.status === 'ESCROW_HOLD');
};