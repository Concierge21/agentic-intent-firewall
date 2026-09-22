/**
 * ============================================================================
 * AGENTIC INTENT FIREWALL (AIF PROTOCOL)
 * ============================================================================
 * - Day 9: Core Express Server, Intent Token Verification & Challenge Middleware
 * - Day 10: Dynamic Policy Engine & Risk Scoring Middleware Integration
 * - Day 11: Human-in-the-Loop (HITL) Escrow Management & UI Dashboard
 * ============================================================================
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { riskScoringMiddleware } from './middleware/riskEngine';

const app = express();
app.use(express.json());

// Serve static files from the 'src/public' folder (Day 11 Dashboard UI)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the dashboard HTML file at the root URL
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// In-memory escrow buffer store for held transactions (Day 11)
const escrowBuffer = new Map<string, any>();

// ============================================================================
// DAY 9: AIF Intent Token & Challenge Middleware
// ============================================================================
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip challenge for escrow management, undo, static files, and root dashboard
  if (
    req.path.startsWith('/ucp/v1/escrow') || 
    req.path.startsWith('/ucp/v1/undo') || 
    req.path === '/'
  ) {
    return next();
  }

  const intentToken = req.headers['x-aif-intent-token'] as string;
  
  // If token is missing or invalid length, issue cryptographic challenge
  if (!intentToken || intentToken.length !== 64) {
    const nonce = crypto.randomBytes(32).toString('hex');
    return res.status(412).json({
      error: 'Precondition Required',
      message: 'AIF Protocol: Agentic intent verification required.',
      challenge: { nonce }
    });
  }

  next();
});

// ============================================================================
// DAY 10: Checkout Route with Dynamic Risk Scoring Middleware
// ============================================================================
app.post('/ucp/v1/checkout', riskScoringMiddleware, (req: Request, res: Response) => {
  const payload = req.body;
  const riskAssessment = (req as any).riskAssessment;

  // Route safe/medium risks to the escrow buffer
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  escrowBuffer.set(transactionId, {
    payload,
    riskAssessment,
    createdAt: Date.now()
  });

  return res.status(202).json({
    success: true,
    message: 'Transaction held in escrow buffer. Human override window active.',
    transactionId,
    expiresInSeconds: 30,
    payload
  });
});

// ============================================================================
// DAY 11: Human-in-the-Loop (HITL) Escrow Management & Dashboard Endpoints
// ============================================================================

// 1. GET: Active escrow holds (Compatible with your Day 11 HTML UI dashboard)
app.get('/ucp/v1/escrow/active', (req: Request, res: Response) => {
  const holds = Array.from(escrowBuffer.entries()).map(([id, data]) => ({
    id,
    payload: data.payload,
    riskAssessment: data.riskAssessment,
    createdAt: data.createdAt
  }));

  return res.status(200).json({ holds });
});

// 2. GET: List pending escrow holds (Detailed view)
app.get('/ucp/v1/escrow/pending', (req: Request, res: Response) => {
  const pending = Array.from(escrowBuffer.entries()).map(([id, data]) => ({
    transactionId: id,
    ...data
  }));
  
  return res.status(200).json({
    success: true,
    count: pending.length,
    pendingTransactions: pending
  });
});

// 3. POST: Abort / Undo an escrow hold (Compatible with dashboard Abort button)
app.post('/ucp/v1/undo/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!escrowBuffer.has(id)) {
    return res.status(404).json({ success: false, message: 'Transaction not found or already executed/cancelled.' });
  }

  escrowBuffer.delete(id);

  return res.status(200).json({
    success: true,
    message: `Transaction ${id} successfully aborted by human override.`
  });
});

// 4. POST: Approve an escrow hold
app.post('/ucp/v1/escrow/approve/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!escrowBuffer.has(id)) {
    return res.status(404).json({ success: false, error: 'Escrow transaction not found or expired.' });
  }

  escrowBuffer.delete(id);

  return res.status(200).json({
    success: true,
    status: 'APPROVED_BY_HUMAN',
    transactionId: id,
    message: 'Transaction successfully released from escrow and executed.'
  });
});

// 5. POST: Deny an escrow hold
app.post('/ucp/v1/escrow/deny/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!escrowBuffer.has(id)) {
    return res.status(404).json({ success: false, error: 'Escrow transaction not found or expired.' });
  }

  escrowBuffer.delete(id);

  return res.status(200).json({
    success: true,
    status: 'DENIED_BY_HUMAN',
    transactionId: id,
    message: 'Transaction explicitly rejected and dropped by administrator.'
  });
});

// ============================================================================
// Server Startup
// ============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agentic Intent Firewall running on port ${PORT}`);
});