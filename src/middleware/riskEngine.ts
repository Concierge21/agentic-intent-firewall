import { Request, Response, NextFunction } from 'express';
import { checkAgentVelocity } from '../services/velocityTracker';
import { activePolicy } from './policyEngine';

export function riskScoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const payload = req.body;
  const agentId = (req.headers['user-agent'] as string) || 'unknown_agent';
  
  let baseScore = 10;
  const triggeredRules: string[] = [];

  // 1. Evaluate payload size / high-value items dynamically
  const items = payload?.items || [];
  const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  
  if (totalQuantity > activePolicy.rules.maxQuantityThreshold) {
    baseScore += activePolicy.weights.excessQuantity;
    triggeredRules.push(`High quantity anomaly detected: ${totalQuantity} items (Threshold: ${activePolicy.rules.maxQuantityThreshold})`);
  }

  // 2. Check for restricted or high-risk SKUs dynamically
  const hasRestrictedSku = items.some((item: any) => activePolicy.rules.highRiskSkus.includes(item.sku));
  if (hasRestrictedSku) {
    baseScore += activePolicy.weights.highRiskSku;
    triggeredRules.push('Restricted SKU detected in transaction payload');
  }

  // 3. Dynamic Velocity & Behavioral Check (Preserved from earlier milestone)
  const velocityCheck = checkAgentVelocity(agentId);
  if (velocityCheck.isVelocitySpike) {
    baseScore += velocityCheck.penaltyScore;
    triggeredRules.push(`Velocity spike detected: ${velocityCheck.requestCount} requests in 60s window (+${velocityCheck.penaltyScore} risk pts)`);
  }

  // 4. Evaluate score against dynamic thresholds
  let decision = 'ALLOW';
  if (baseScore >= activePolicy.thresholds.high) {
    decision = 'DENY';
  } else if (baseScore >= activePolicy.thresholds.medium) {
    decision = 'ESCROW';
  }

  // Attach calculated risk metrics to request object for upstream handlers
  (req as any).riskAssessment = {
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