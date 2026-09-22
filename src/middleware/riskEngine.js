"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskScoringMiddleware = riskScoringMiddleware;
const velocityTracker_1 = require("../services/velocityTracker");
function riskScoringMiddleware(req, res, next) {
    const payload = req.body;
    const agentId = req.headers['user-agent'] || 'unknown_agent';
    let baseScore = 10;
    const triggeredRules = [];
    // 1. Evaluate payload size / high-value items
    const items = payload?.items || [];
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalQuantity > 5) {
        baseScore += 30;
        triggeredRules.push(`High quantity anomaly detected: ${totalQuantity} items`);
    }
    // 2. Check for restricted or high-risk SKUs
    const hasRestrictedSku = items.some((item) => item.sku?.includes('RESTRICTED') || item.sku === 'SKU-999');
    if (hasRestrictedSku) {
        baseScore += 50;
        triggeredRules.push('Restricted SKU detected in transaction payload');
    }
    // 3. DAY 11: Dynamic Velocity & Behavioral Check
    const velocityCheck = (0, velocityTracker_1.checkAgentVelocity)(agentId);
    if (velocityCheck.isVelocitySpike) {
        baseScore += velocityCheck.penaltyScore;
        triggeredRules.push(`Velocity spike detected: ${velocityCheck.requestCount} requests in 60s window (+${velocityCheck.penaltyScore} risk pts)`);
    }
    // Attach calculated risk metrics to request object for upstream handlers
    req.riskAssessment = {
        score: baseScore,
        triggeredRules,
        decision: baseScore >= 75 ? 'DENY' : baseScore >= 30 ? 'ESCROW' : 'ALLOW'
    };
    // If score is a hard DENY, block immediately
    if (baseScore >= 75) {
        return res.status(403).json({
            success: false,
            status: 'BLOCKED',
            message: 'Firewall Policy Violation: Risk score exceeded safe operational threshold.',
            riskScore: baseScore,
            violations: triggeredRules
        });
    }
    next();
}
