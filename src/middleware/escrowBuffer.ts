import { Request, Response, NextFunction } from 'express';

interface EscrowTransaction {
  id: string;
  payload: any;
  timestamp: number;
  status: 'held' | 'committed' | 'aborted';
}

const activeEscrows = new Map<string, EscrowTransaction>();

export const escrowMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const transaction: EscrowTransaction = {
    id: transactionId,
    payload: req.body,
    timestamp: Date.now(),
    status: 'held'
  };

  activeEscrows.set(transactionId, transaction);

  console.log(`[Escrow Buffer] Transaction ${transactionId} held for 30 seconds pending human override.`);

  const timer = setTimeout(() => {
    const txn = activeEscrows.get(transactionId);
    if (txn && txn.status === 'held') {
      txn.status = 'committed';
      console.log(`[Escrow Buffer] Transaction ${transactionId} timeout expired. Committed to backend.`);
    }
  }, 30000);

  return res.status(200).json({
    success: true,
    message: 'Transaction intercepted and held in Escrow Buffer.',
    transactionId,
    holdDurationSeconds: 30,
    overrideInstruction: `To cancel this order, send a POST request to /ucp/v1/undo/${transactionId}`
  });
};

export const undoTransaction = (req: Request, res: Response) => {
  const id = req.params.id as string; // Explicit type casting to string
  const txn = activeEscrows.get(id);

  if (!txn) {
    return res.status(404).json({ error: 'Transaction not found or already expired.' });
  }

  if (txn.status !== 'held') {
    return res.status(400).json({ error: `Cannot undo. Transaction status is already ${txn.status}.` });
  }

  txn.status = 'aborted';
  activeEscrows.delete(id);

  console.log(`[Escrow Buffer] HUMAN OVERRIDE: Transaction ${id} successfully aborted.`);
  return res.status(200).json({
    success: true,
    message: `Transaction ${id} successfully intercepted and aborted by human operator.`
  });
};