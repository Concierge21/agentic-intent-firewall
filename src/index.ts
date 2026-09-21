import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path'; 
import { logAuditEvent } from './services/auditLogger'; 
import { riskScoringMiddleware } from './middleware/riskEngine'; // <-- DAY 10 ADDED: Importing the risk engine

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(express.static(path.join(__dirname, '../public')));

const escrowStore: { [key: string]: { timeoutId: NodeJS.Timeout; payload: any } } = {};

app.get('/aif/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'active', firewall: 'Agentic Intent & Liability Firewall (Day 10)', version: '1.0.0' });
});

// Unified Checkout Route: Challenge Check + Risk Engine + Escrow Hold
// <-- DAY 10 ADDED: riskScoringMiddleware inserted into the route definition below
app.post('/ucp/v1/checkout', riskScoringMiddleware, (req: Request, res: Response) => {
  const incomingToken = req.headers['x-aif-intent-token'] as string;

  if (!incomingToken) {
    const freshChallenge = crypto.randomBytes(32).toString('hex');
    return res.status(428).json({
      error: 'Precondition Required',
      message: 'AIF Protocol: Agentic intent verification required.',
      challenge: { nonce: freshChallenge }
    });
  }

  if (incomingToken.length !== 64) {
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid cryptographic intent proof.' });
  }

  const transactionId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  console.log(`[Escrow Hold] Transaction ${transactionId} created. Holding for 30 seconds...`);

  logAuditEvent({
      eventType: 'CHECKOUT_ESCROWED',
      transactionId: transactionId,
      intentToken: incomingToken,
      payload: req.body
  });

  const timeoutId = setTimeout(() => {
    console.log(`[Escrow Executed] Timer expired for ${transactionId}. Executing upstream transaction.`);
    
    logAuditEvent({
        eventType: 'TRANSACTION_EXECUTED',
        transactionId: transactionId
    });
    
    delete escrowStore[transactionId];
  }, 30000);

  escrowStore[transactionId] = { timeoutId, payload: req.body };

  return res.status(200).json({
    success: true,
    message: 'Transaction held in escrow buffer. Human override window active.',
    transactionId,
    expiresInSeconds: 30,
    payload: req.body
  });
});

app.post('/ucp/v1/undo/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const transaction = escrowStore[id];

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found or already executed/cancelled.' });
  }

  clearTimeout(transaction.timeoutId);
  delete escrowStore[id];

  console.log(`[Human Override] Transaction ${id} successfully cancelled and aborted.`);

  logAuditEvent({
      eventType: 'TRANSACTION_ABORTED',
      transactionId: id
  });

  return res.status(200).json({
    success: true,
    message: `Transaction ${id} successfully aborted by human override.`,
  });
});

app.get('/ucp/v1/escrow/active', (req: Request, res: Response) => {
  const activeHolds = Object.keys(escrowStore).map(id => ({
    id,
    payload: escrowStore[id].payload
  }));
  return res.status(200).json({ holds: activeHolds });
});

app.listen(PORT, () => {
  console.log(`Agentic Intent & Liability Firewall (Day 10) running on port ${PORT}`);
});