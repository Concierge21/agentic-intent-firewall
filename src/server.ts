import express, { Request, Response, NextFunction } from 'express';
import { policyEngine } from './middleware/policyEngine';
import { getAllHolds, resolveTransaction, storeHold } from './services/escrowService';
import { authenticateAgent } from './middleware/authMiddleware';
import path from 'path';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Serve static files for the Command Center UI
app.use(express.static(path.join(__dirname, '../public')));

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || 'https://graceful-canyon-46.webhook.cool';

async function dispatchSecurityAlert(assessment: any, payload: any, agent: any) {
  try {
    if (!ALERT_WEBHOOK_URL || ALERT_WEBHOOK_URL.includes('your-unique-id')) return;

    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'HIGH_RISK_INTENT_INTERCEPTED',
        timestamp: new Date().toISOString(),
        agentId: agent.id,
        agentName: agent.name,
        score: assessment.score,
        triggeredRules: assessment.triggeredRules,
        payload
      })
    });
    console.log(`🚨 [Webhook] Security alert dispatched for agent: ${agent.name}`);
  } catch (err) {
    console.error('⚠️ [Webhook Error] Failed to send security alert:', err);
  }
}

// 0. Command Center Web UI Route
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
      <p>Active Escrow Holds & Human-in-the-Loop Interventions</p>
      <table>
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Agent Identity</th>
            <th>Payload</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="holds-table">
          <tr><td colspan="5" style="text-align:center;">Loading holds...</td></tr>
        </tbody>
      </table>

      <script>
        async function fetchHolds() {
          const res = await fetch('/ucp/v1/escrow/active');
          const data = await res.json();
          const tbody = document.getElementById('holds-table');
          
          if (!data.holds || data.holds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No active escrow holds trapped yet. Run your curl test command!</td></tr>';
            return;
          }

          tbody.innerHTML = data.holds.map(h => {
            const agentName = h.payload._agentName || 'Unknown Agent';
            return "<tr>" +
              "<td>" + h.id + "</td>" +
              "<td><span class='agent-badge'>" + agentName + "</span></td>" +
              "<td><code>" + JSON.stringify(h.payload.items || h.payload) + "</code></td>" +
              "<td><b>" + h.status + "</b></td>" +
              "<td>" +
                (h.status === 'ESCROW_HOLD' ? 
                  "<button class='btn-approve' onclick='resolve(\\\"" + h.id + "\\\", \\\"approve\\\")'>Approve</button>" +
                  "<button class='btn-deny' onclick='resolve(\\\"" + h.id + "\\\", \\\"deny\\\")'>Deny</button>" 
                  : "<em>Resolved</em>") +
              "</td>" +
            "</tr>";
          }).join('');
        }

        async function resolve(id, action) {
          await fetch('/ucp/v1/escrow/' + action + '/' + id, { method: 'POST' });
          fetchHolds();
        }

        fetchHolds();
        setInterval(fetchHolds, 3000);
      </script>
    </body>
    </html>
  `);
});

// 1. Live Audit Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url === '/ucp/v1/escrow/active') return next(); 
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.url}`);
  next();
});

// 2. Gateway Checkout Route (Secured with authenticateAgent Middleware)
app.post('/api/checkout', authenticateAgent, (req: Request, res: Response) => {
  const payload = req.body;
  const agent = (req as any).agent;
  const assessment = policyEngine.evaluate(payload);

  if (assessment.decision === 'ESCROW') {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`❌ [SECURITY INTERCEPT] Decision: ESCROW | ID: ${transactionId} | Risk Score: ${assessment.score}`);
    console.log(`   Agent Identity: ${agent.name} (${agent.id})`);
    console.log(`   Rules Triggered:`, assessment.triggeredRules);
    
    const storedPayload = { ...payload, _agentName: agent.name };

    storeHold({
      transactionId,
      payload: storedPayload,
      assessment,
      status: 'ESCROW_HOLD',
      createdAt: Date.now()
    });

    dispatchSecurityAlert(assessment, payload, agent);
  } else {
    console.log(`✅ [ALLOWED] Decision: ALLOW | Agent: ${agent.name} | Risk Score: ${assessment.score}`);
  }

  res.json({
    success: true,
    message: assessment.decision === 'ESCROW' 
      ? 'Transaction held in escrow buffer for human verification.' 
      : 'Intent verified and executed safely.',
    agent: agent.name,
    assessment
  });
});

// 3. Human-in-the-Loop Resolution & Cryptographic Auditing
app.get('/api/escrow/holds', (req: Request, res: Response) => {
  const holds = getAllHolds();
  res.json({ success: true, holds });
});

app.get('/ucp/v1/escrow/active', (req: Request, res: Response) => {
  const holds = getAllHolds();
  res.json({ holds: holds.map(h => ({ id: h.transactionId, payload: h.payload, status: h.status })) });
});

app.post('/ucp/v1/escrow/:action/:id', (req: Request, res: Response) => {
  const { action } = req.params;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const internalAction = action === 'approve' ? 'CLEAR' : 'ABORT';

  const success = resolveTransaction(id, internalAction);

  if (!success) {
    return res.status(400).json({ 
      success: false, 
      message: `Could not process ${action} for transaction ${id}.` 
    });
  }

  const hash = crypto.createHash('sha256').update(`${id}-${internalAction}-${Date.now()}`).digest('hex');
  
  console.log(`🛡️ Transaction ${id} successfully ${action}d by human operator.`);
  console.log(`🔒 [Audit Logged] Cryptographic Ledger Hash: ${hash}`);

  res.json({ 
    success: true, 
    message: `Transaction ${id} successfully ${action}d.`,
    auditHash: hash
  });
});

app.listen(3000, () => {
  console.log('🚀 AIF Secured Gateway running on port 3000');
  console.log('🔒 Day 18 API Key Authentication & Identity Logging Enabled');
});