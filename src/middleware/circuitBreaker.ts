import { Request, Response, NextFunction } from 'express';

// Circuit States: CLOSED (normal), OPEN (tripped/failing fast), HALF_OPEN (testing recovery)
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitTracker {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
}

// Track circuit status per agent or downstream route
const circuitRegistry = new Map<string, CircuitTracker>();

// Configuration thresholds
const FAILURE_THRESHOLD = 3;       // Number of errors before tripping open
const RESET_TIMEOUT_MS = 15 * 1000;  // 15 seconds cooldown before half-open test

export function circuitBreaker(req: Request, res: Response, next: NextFunction) {
  const identifier = (req.headers['x-aif-intent-token'] as string) || req.ip || 'anonymous_agent';
  const now = Date.now();

  let tracker = circuitRegistry.get(identifier) || {
    state: 'CLOSED',
    failures: 0,
    lastFailureTime: 0
  };

  // Check if circuit is OPEN
  if (tracker.state === 'OPEN') {
    // Check if the recovery timeout has elapsed
    if (now - tracker.lastFailureTime > RESET_TIMEOUT_MS) {
      tracker.state = 'HALF_OPEN';
      console.warn(`⚡ [CIRCUIT BREAKER] Circuit entering HALF_OPEN state for test requests: ${identifier}`);
    } else {
      console.warn(`🛑 [CIRCUIT BREAKER] Circuit is OPEN. Failing fast for agent: ${identifier}`);
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'AIF Circuit Breaker Active: Too many consecutive errors or blocked intents. Circuit is OPEN.',
        retryAfterSeconds: Math.ceil((RESET_TIMEOUT_MS - (now - tracker.lastFailureTime)) / 1000)
      });
    }
  }

  // Attach a response finish listener to catch server errors or downstream failures
  res.on('finish', () => {
    // If response status indicates a server error or security block
    if (res.statusCode >= 500 || res.statusCode === 429 || res.statusCode === 400) {
      tracker.failures += 1;
      tracker.lastFailureTime = Date.now();

      if (tracker.failures >= FAILURE_THRESHOLD) {
        tracker.state = 'OPEN';
        console.error(`🚨 [CIRCUIT BREAKER] Failure threshold reached! Circuit tripped to OPEN for: ${identifier}`);
      }
    } else if (tracker.state === 'HALF_OPEN' && res.statusCode < 400) {
      // Recovery successful during half-open test, close the circuit
      tracker.state = 'CLOSED';
      tracker.failures = 0;
      console.log(`✅ [CIRCUIT BREAKER] Recovery successful. Circuit reset to CLOSED for: ${identifier}`);
    }
    
    circuitRegistry.set(identifier, tracker);
  });

  next();
}