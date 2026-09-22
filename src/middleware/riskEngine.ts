import { Request, Response, NextFunction } from 'express';
import { checkAgentVelocity } from '../services/velocityTracker';

export function riskScoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const payload = req.body;
  const agentId = (req.headers['user-agent'] as string) || 'unknown_agent';
  
  let baseScore = 10;
  const triggeredRules: string[] = [];

  // 1. Evaluate payload size / high-value items
  const items = payload?.items || [];
  const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  
  if (totalQuantity > 5) {
    baseScore += 30;
    triggeredRules.push(`High quantity anomaly detected: ${totalQuantity} items`);
  }

  // 2. Check for restricted or high-risk SKUs
  const hasRestrictedSku = items.some((item: any) => item.sku?.includes('RESTRICTED') || item.sku === 'SKU-999');
  if (hasRestrictedSku) {
    baseScore += 50;
    triggeredRules.push('Restricted SKU detected in transaction payload');
  }

  // 3. DAY 11: Dynamic Velocity & Behavioral Check
  const velocityCheck = checkAgentVelocity(agentId);
  if (velocityCheck.isVelocitySpike) {
    baseScore += velocityCheck.penaltyScore;
    triggeredRules.push(`Velocity spike detected: ${velocityCheck.requestCount} requests in 60s window (+${velocityCheck.penaltyScore} risk pts)`);
  }

  // Attach calculated risk metrics to request object for upstream handlers
  (req as any).riskAssessment = {
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