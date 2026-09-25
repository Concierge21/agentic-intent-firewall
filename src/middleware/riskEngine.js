"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskScoringMiddleware = riskScoringMiddleware;
const velocityTracker_1 = require("../services/velocityTracker");
const policyEngine_1 = require("./policyEngine");
function riskScoringMiddleware(req, res, next) {
    const payload = req.body;
    const agentId = req.headers['user-agent'] || 'unknown_agent';
    let baseScore = 10;
    const triggeredRules = [];
    // 1. Evaluate payload size / high-value items dynamically
    const items = payload?.items || [];
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalQuantity > policyEngine_1.activePolicy.rules.maxQuantityThreshold) {
        baseScore += policyEngine_1.activePolicy.weights.excessQuantity;
        triggeredRules.push(`High quantity anomaly detected: ${totalQuantity} items (Threshold: ${policyEngine_1.activePolicy.rules.maxQuantityThreshold})`);
    }
    // 2. Check for restricted or high-risk SKUs dynamically
    const hasRestrictedSku = items.some((item) => policyEngine_1.activePolicy.rules.highRiskSkus.includes(item.sku));
    if (hasRestrictedSku) {
        baseScore += policyEngine_1.activePolicy.weights.highRiskSku;
        triggeredRules.push('Restricted SKU detected in transaction payload');
    }
    // 3. Dynamic Velocity & Behavioral Check (Preserved from earlier milestone)
    const velocityCheck = (0, velocityTracker_1.checkAgentVelocity)(agentId);
    if (velocityCheck.isVelocitySpike) {
        baseScore += velocityCheck.penaltyScore;
        triggeredRules.push(`Velocity spike detected: ${velocityCheck.requestCount} requests in 60s window (+${velocityCheck.penaltyScore} risk pts)`);
    }
    // 4. Evaluate score against dynamic thresholds
    let decision = 'ALLOW';
    if (baseScore >= policyEngine_1.activePolicy.thresholds.high) {
        decision = 'DENY';
    }
    else if (baseScore >= policyEngine_1.activePolicy.thresholds.medium) {
        decision = 'ESCROW';
    }
    // Attach calculated risk metrics to request object for upstream handlers
    req.riskAssessment = {
        score: baseScore,
        triggeredRules,
        decision
    };
    // If score hits the high threshold, block immediately
    if (decision === 'DENY') {
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
