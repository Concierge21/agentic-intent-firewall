import { Request, Response, NextFunction } from 'express';
import { riskScoringMiddleware } from './middleware/riskEngine';
import { validateCheckoutPayload } from './middleware/validatePayload';
import { rateLimiter } from './middleware/rateLimiter';
import { circuitBreaker } from './middleware/circuitBreaker';
import { loadPolicy, watchPolicy } from './middleware/policyEngine';
import { escrowManager } from './services/escrowMachine';
import { logAuditEvent } from './services/auditLogger';

export interface AIFOptions {
  enableHotReload?: boolean;
  defaultTtlSeconds?: number;
}

export interface AIFInstance {
  circuitBreaker: typeof circuitBreaker;
  rateLimiter: typeof rateLimiter;
  validateCheckoutPayload: typeof validateCheckoutPayload;
  riskScoringMiddleware: typeof riskScoringMiddleware;
  escrowManager: typeof escrowManager;
  logAuditEvent: typeof logAuditEvent;
}

export function initAIF(options: AIFOptions = {}): AIFInstance {
  if (options.enableHotReload !== false) {
    loadPolicy();
    watchPolicy();
  }

  return {
    circuitBreaker,
    rateLimiter,
    validateCheckoutPayload,
    riskScoringMiddleware,
    escrowManager,
    logAuditEvent
  };
}

export * from './services/escrowMachine';
export * from './services/auditLogger';