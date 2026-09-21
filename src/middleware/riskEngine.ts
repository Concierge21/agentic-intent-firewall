import { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../services/auditLogger';
import fs from 'fs';
import path from 'path';

// Helper to load policies dynamically
const loadPolicies = () => {
  try {
    const configPath = path.join(__dirname, '../config/policies.json');
    const rawData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.warn('Could not load policies.json, falling back to defaults.');
    return {
      thresholds: { medium: 30, high: 50 },
      rules: { highRiskSkus: ['SKU-999'], maxQuantityThreshold: 5 },
      weights: { highRiskSku: 30, excessQuantity: 30 }
    };
  }
};

export const riskScoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { items } = req.body || {};
  let score = 0;
  const flags: string[] = [];
  const policies = loadPolicies();

  if (Array.isArray(items)) {
    for (const item of items) {
      // Dynamic Quantity Check
      if (item.quantity > policies.rules.maxQuantityThreshold) {
        score += policies.weights.excessQuantity;
        flags.push(`High quantity alert: SKU ${item.sku} requests quantity of ${item.quantity}`);
      }
      // Dynamic SKU Check
      if (policies.rules.highRiskSkus.includes(item.sku)) {
        score += policies.weights.highRiskSku;
        flags.push(`Flagged restricted or high-value SKU (${item.sku})`);
      }
    }
  }

  let level = 'LOW';
  if (score >= policies.thresholds.medium && score < policies.thresholds.high) level = 'MEDIUM';
  if (score >= policies.thresholds.high) level = 'HIGH';

  if (level === 'HIGH') {
    const token = req.headers['x-aif-intent-token'] as string;
    
    logAuditEvent({
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

  (req as any).riskAssessment = { score, level, flags };
  next();
};