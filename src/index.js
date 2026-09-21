"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const auditLogger_1 = require("./services/auditLogger");
const riskEngine_1 = require("./middleware/riskEngine"); // <-- DAY 10 ADDED: Importing the risk engine
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
const escrowStore = {};
app.get('/aif/health', (req, res) => {
    res.status(200).json({ status: 'active', firewall: 'Agentic Intent & Liability Firewall (Day 10)', version: '1.0.0' });
});
// Unified Checkout Route: Challenge Check + Risk Engine + Escrow Hold
// <-- DAY 10 ADDED: riskScoringMiddleware inserted into the route definition below
app.post('/ucp/v1/checkout', riskEngine_1.riskScoringMiddleware, (req, res) => {
    const incomingToken = req.headers['x-aif-intent-token'];
    if (!incomingToken) {
        const freshChallenge = crypto_1.default.randomBytes(32).toString('hex');
        return res.status(428).json({
            error: 'Precondition Required',
            message: 'AIF Protocol: Agentic intent verification required.',
            challenge: { nonce: freshChallenge }
        });
    }
    if (incomingToken.length !== 64) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid cryptographic intent proof.' });
    }
    const transactionId = `txn_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
    console.log(`[Escrow Hold] Transaction ${transactionId} created. Holding for 30 seconds...`);
    (0, auditLogger_1.logAuditEvent)({
        eventType: 'CHECKOUT_ESCROWED',
        transactionId: transactionId,
        intentToken: incomingToken,
        payload: req.body
    });
    const timeoutId = setTimeout(() => {
        console.log(`[Escrow Executed] Timer expired for ${transactionId}. Executing upstream transaction.`);
        (0, auditLogger_1.logAuditEvent)({
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
app.post('/ucp/v1/undo/:id', (req, res) => {
    const id = req.params.id;
    const transaction = escrowStore[id];
    if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found or already executed/cancelled.' });
    }
    clearTimeout(transaction.timeoutId);
    delete escrowStore[id];
    console.log(`[Human Override] Transaction ${id} successfully cancelled and aborted.`);
    (0, auditLogger_1.logAuditEvent)({
        eventType: 'TRANSACTION_ABORTED',
        transactionId: id
    });
    return res.status(200).json({
        success: true,
        message: `Transaction ${id} successfully aborted by human override.`,
    });
});
app.get('/ucp/v1/escrow/active', (req, res) => {
    const activeHolds = Object.keys(escrowStore).map(id => ({
        id,
        payload: escrowStore[id].payload
    }));
    return res.status(200).json({ holds: activeHolds });
});
app.listen(PORT, () => {
    console.log(`Agentic Intent & Liability Firewall (Day 10) running on port ${PORT}`);
});
