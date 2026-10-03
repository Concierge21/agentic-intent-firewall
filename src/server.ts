import express, { Request, Response, NextFunction } from 'express';
import { policyEngine } from './middleware/policyEngine';
import { getAllHolds, resolveTransaction, storeHold } from './services/escrowService';
import { authenticateAgent } from './middleware/authMiddleware';
import { circuitBreakerMiddleware, recordFailure, resetBreaker } from './middleware/circuitBreaker';
import { rateLimiter } from './middleware/rateLimiter';
import { initDB } from './config/database';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || 'https://graceful-canyon-46.webhook.cool';

async function dispatchSecurityAlert(assessment: any, payload: any, agent: any) {
  try {
    if (!ALERT_WEBHOOK_URL || ALERT_WEBHOOK_URL.includes('your-unique-id')) return;
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'HIGH_RISK_INTENT_INTERCEPTED', timestamp: new Date().toISOString(),
        agentId: agent.id, agentName: agent.name, score: assessment.score,
        triggeredRules: assessment.triggeredRules, payload
      })
    });
    console.log(`🚨 [Webhook] Security alert dispatched for agent: ${agent.name}`);
  } catch (err) {
    console.error('⚠️ [Webhook Error] Failed to send security alert:', err);
  }
}

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AIF Command Center</title>
      <style>
        body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
        h1 { color: #38bdf8; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; background: #1e293b; border-radius: 8px; overflow: hidden; }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: #334155; color: #94a3b8; }
        button { border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-right: 4px; }
        .btn-approve { background: #22c55e; color: #022c22; }
        .btn-deny { background: #ef4444; color: #450a0a; }
        .agent-badge { background: #38bdf8; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>🛡️ Agentic Intent Firewall - Operations Command Center</h1>
      <table>
        <thead><tr><th>Transaction ID</th><th>Agent Identity</th><th>Payload</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="holds-table"><tr><td colspan="5">Loading holds...</td></tr></tbody>
      </table>
      <script>
        async function fetchHolds() {
          const res = await fetch('/ucp/v1/escrow/active');
          const data = await res.json();
          const tbody = document.getElementById('holds-table');
          if (!data.holds || data.holds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No active escrow holds trapped yet.</td></tr>';
            return;
          }
          tbody.innerHTML = data.holds.map(h => {
            const agentName = h.payload._agentName || 'Unknown Agent';
            return "<tr><td>" + h.id + "</td><td><span class='agent-badge'>" + agentName + "</span></td><td><code>" + JSON.stringify(h.payload.items || h.payload) + "</code></td><td><b>" + h.status + "</b></td><td>" +
                (h.status === 'ESCROW_HOLD' ? "<button class='btn-approve' onclick='resolve(\\\"" + h.id + "\\\", \\\"approve\\\")'>Approve</button><button class='btn-deny' onclick='resolve(\\\"" + h.id + "\\\", \\\"deny\\\")'>Deny</button>" : "<em>Resolved</em>") +
              "</td></tr>";
          }).join('');
        }
        async function resolve(id, action) { await fetch('/ucp/v1/escrow/' + action + '/' + id, { method: 'POST' }); fetchHolds(); }
        fetchHolds(); setInterval(fetchHolds, 3000);
      </script>
    </body>
    </html>
  `);
});

// ============================================================================
// DAY 21: DYNAMIC POLICY HOT-SWAPPING ENDPOINT
// ============================================================================
app.post('/ucp/v1/admin/policies', (req: Request, res: Response) => {
  const newPolicies = req.body;
  // FIXED PATH: Now properly points to the src folder
  const policyPath = path.join(__dirname, '../src/config/policies.json');
  
  try {
    fs.writeFileSync(policyPath, JSON.stringify(newPolicies, null, 2));
    const auditHash = crypto.createHash('sha256').update(`POLICY_UPDATE_${Date.now()}_${JSON.stringify(newPolicies)}`).digest('hex');
    console.log(`\n🔐 [Admin] Security Policies hot-swapped live! Audit Hash: ${auditHash}`);
    res.json({ success: true, message: 'Policies updated successfully', auditHash });
  } catch (err) {
    console.error('File Write Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update policies.' });
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url === '/ucp/v1/escrow/active') return next(); 
  console.log(`\n📥 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================================
// DAY 22: RATE LIMITER ADDED INTO THE MIDDLEWARE PIPELINE
// ============================================================================
app.post('/api/checkout', authenticateAgent, rateLimiter, circuitBreakerMiddleware, async (req: Request, res: Response) => {
  const payload = req.body;
  const agent = (req as any).agent;
  const assessment = policyEngine.evaluate(payload);

  if (assessment.decision === 'ESCROW') {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const storedPayload = { ...payload, _agentName: agent.name };

    console.log(`❌ [SECURITY INTERCEPT] Decision: ESCROW | ID: ${transactionId}`);
    
    await storeHold({ transactionId, payload: storedPayload, assessment, status: 'ESCROW_HOLD', createdAt: Date.now() });
    recordFailure(agent.name);
    await dispatchSecurityAlert(assessment, payload, agent);
  } else {
    console.log(`✅ [ALLOWED] Agent: ${agent.name} | Risk Score: ${assessment.score}`);
    resetBreaker(agent.name);
  }

  res.json({ success: true, message: assessment.decision === 'ESCROW' ? 'Transaction held.' : 'Executed safely.', agent: agent.name, assessment });
});

app.get('/ucp/v1/escrow/active', async (req: Request, res: Response) => {
  const holds = await getAllHolds();
  res.json({ holds: holds.map((h: any) => ({ id: h.transactionId, payload: h.payload, status: h.status })) });
});

app.post('/ucp/v1/escrow/:action/:id', async (req: Request, res: Response) => {
  const { action } = req.params;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const internalAction = action === 'approve' ? 'CLEAR' : 'ABORT';

  const success = await resolveTransaction(id, internalAction);
  if (!success) return res.status(400).json({ success: false, message: `Could not process ${action}.` });

  const hash = crypto.createHash('sha256').update(`${id}-${internalAction}-${Date.now()}`).digest('hex');
  console.log(`🛡️ Transaction ${id} successfully ${action}d. Audit Hash: ${hash}`);

  res.json({ success: true, auditHash: hash });
});

initDB().then(() => {
  app.listen(3000, () => {
    console.log('🚀 AIF Secured Gateway running on port 3000');
    console.log('🔒 Day 21 Policy Hot-Swapping & Day 22 Rate Limiting Active');
  });
});