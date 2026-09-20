"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskScoringMiddleware = void 0;
const auditLogger_1 = require("../services/auditLogger");
const riskScoringMiddleware = (req, res, next) => {
    const { items } = req.body || {};
    let score = 0;
    const flags = [];
    if (Array.isArray(items)) {
        for (const item of items) {
            if (item.quantity > 5) {
                score += 30;
                flags.push(`High quantity alert: SKU ${item.sku} requests quantity of ${item.quantity}`);
            }
            if (item.sku === 'SKU-999') {
                score += 30;
                flags.push(`Flagged restricted or high-value test SKU (${item.sku})`);
            }
        }
    }
    let level = 'LOW';
    if (score >= 30 && score < 50)
        level = 'MEDIUM';
    if (score >= 50)
        level = 'HIGH';
    if (level === 'HIGH') {
        const token = req.headers['x-aif-intent-token'];
        (0, auditLogger_1.logAuditEvent)({
            eventType: 'CHECKOUT_BLOCKED',
            intentToken: token,
            riskAssessment: { score, level, flags },
            payload: req.body
        });
        return res.status(403).json({
            error: 'Transaction Blocked by Risk Engine',
            message: 'AIF Protocol: Operation exceeded maximum allowable risk threshold.',
            riskAssessment: { score, level, flags }
        });
    }
    req.riskAssessment = { score, level, flags };
    next();
};
exports.riskScoringMiddleware = riskScoringMiddleware;
