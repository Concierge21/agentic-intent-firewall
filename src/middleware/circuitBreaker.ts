import { Request, Response, NextFunction } from 'express';

const failedAttempts: Record<string, number> = {};
const MAX_FAILURES = 3;

export function recordFailure(agentName: string) {
  if (!failedAttempts[agentName]) failedAttempts[agentName] = 0;
  failedAttempts[agentName]++;
  console.log(`⚠ [Circuit Breaker] ${agentName} strike ${failedAttempts[agentName]}/${MAX_FAILURES}`);
}

export function resetBreaker(agentName: string) {
  if (failedAttempts[agentName]) {
    failedAttempts[agentName] = 0;
    console.log(`✅ [Circuit Breaker] Reset for ${agentName}`);
  }
}

export function circuitBreakerMiddleware(req: Request, res: Response, next: NextFunction) {
  const agent = (req as any).agent;
  if (!agent) return next();

  if (failedAttempts[agent.name] >= MAX_FAILURES) {
    console.log(`🛑 [BLOCKED] ${agent.name} is completely locked out by the Circuit Breaker.`);
    return res.status(403).json({
      success: false,
      message: `Circuit Breaker tripped for ${agent.name}. Too many high-risk intents. System locked.`
    });
  }
  next();
}

// Quick fix so we don't have to edit index.ts or sdk.ts tonight
export const circuitBreaker = circuitBreakerMiddleware;