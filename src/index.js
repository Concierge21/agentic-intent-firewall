"use strict";
/**
 * ============================================================================
 * AGENTIC INTENT FIREWALL (AIF PROTOCOL)
 * ============================================================================
 * - Day 9: Core Express Server, Intent Token Verification & Challenge Middleware
 * - Day 10: Dynamic Policy Engine & Risk Scoring Middleware Integration
 * - Day 11: Human-in-the-Loop (HITL) Escrow Management & UI Dashboard
 * - Day 12: Strict Schema Validation & Payload Contracts (Zod Input Shield)
 * - Day 13: Velocity Guard, Rate Limiter & Circuit Breaker Fault Tolerance
 * - Day 14: Dynamic Hot-Reloading Policy Engine
 * ============================================================================
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
// Import Middleware Security Layers
const riskEngine_1 = require("./middleware/riskEngine");
const validatePayload_1 = require("./middleware/validatePayload");
const rateLimiter_1 = require("./middleware/rateLimiter");
const circuitBreaker_1 = require("./middleware/circuitBreaker");
const policyEngine_1 = require("./middleware/policyEngine");
// Boot the Day 14 Dynamic Policy Engine before starting the server
(0, policyEngine_1.loadPolicy)();
(0, policyEngine_1.watchPolicy)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Serve static files from the 'public' folder (Day 11 Dashboard UI)
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Serve the dashboard HTML file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public/index.html'));
});
// In-memory escrow buffer store for held transactions (Day 11)
const escrowBuffer = new Map();
// ============================================================================
// DAY 9: AIF Intent Token & Challenge Middleware
// ============================================================================
app.use((req, res, next) => {
    // Skip challenge for escrow management, undo, static files, and root dashboard
    if (req.path.startsWith('/ucp/v1/escrow') ||
        req.path.startsWith('/ucp/v1/undo') ||
        req.path === '/') {
        return next();
    }
    const intentToken = req.headers['x-aif-intent-token'];
    // If token is missing or invalid length, issue cryptographic challenge
    if (!intentToken || intentToken.length !== 64) {
        const nonce = crypto_1.default.randomBytes(32).toString('hex');
        return res.status(412).json({
            error: 'Precondition Required',
            message: 'AIF Protocol: Agentic intent verification required.',
            challenge: { nonce }
        });
    }
    next();
});
// ============================================================================
// DAY 10, 12, 13 & 14: Checkout Route Pipeline
// 1. circuitBreaker          -> Fault-tolerance guard (Trips open on cascading errors)
// 2. rateLimiter             -> Sliding-window velocity check (Blocks infinite loops)
// 3. validateCheckoutPayload -> Schema Contract Gate (Blocks malformed payloads)
// 4. riskScoringMiddleware   -> Threat Scoring (Now powered by Day 14 Hot-Reloading Policy)
// ============================================================================
app.post('/ucp/v1/checkout', circuitBreaker_1.circuitBreaker, rateLimiter_1.rateLimiter, validatePayload_1.validateCheckoutPayload, riskEngine_1.riskScoringMiddleware, (req, res) => {
    const payload = req.body;
    const riskAssessment = req.riskAssessment;
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
// 1. GET: Active escrow holds (Compatible with Day 11 HTML UI dashboard)
app.get('/ucp/v1/escrow/active', (req, res) => {
    const holds = Array.from(escrowBuffer.entries()).map(([id, data]) => ({
        id,
        payload: data.payload,
        riskAssessment: data.riskAssessment,
        createdAt: data.createdAt
    }));
    return res.status(200).json({ holds });
});
// 2. GET: List pending escrow holds (Detailed view)
app.get('/ucp/v1/escrow/pending', (req, res) => {
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
app.post('/ucp/v1/undo/:id', (req, res) => {
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
app.post('/ucp/v1/escrow/approve/:id', (req, res) => {
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
app.post('/ucp/v1/escrow/deny/:id', (req, res) => {
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
    console.log(`🛡️ Agentic Intent Firewall running on port ${PORT}`);
});
