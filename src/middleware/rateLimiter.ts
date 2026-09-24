import { Request, Response, NextFunction } from 'express';

// Track request timestamps per agent/IP
const requestTracker = new Map<string, number[]>();

// Configuration: Max 5 requests per 10 seconds per agent
const WINDOW_SIZE_MS = 10 * 1000; 
const MAX_REQUESTS = 5;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Identify the agent using their intent token or fallback to IP address
  const identifier = (req.headers['x-aif-intent-token'] as string) || req.ip || 'anonymous_agent';
  const now = Date.now();

  // Get existing timestamps for this agent
  let timestamps = requestTracker.get(identifier) || [];

  // Filter out timestamps outside the current sliding window
  timestamps = timestamps.filter(timestamp => now - timestamp < WINDOW_SIZE_MS);

  // Check if agent has exceeded the rate limit
  if (timestamps.length >= MAX_REQUESTS) {
    console.warn(`🛡️ [RATE LIMIT] Runaway agent loop detected for identifier: ${identifier}`);

    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'AIF Velocity Guard: Rate limit exceeded. Runaway agent loop detected.',
      retryAfterSeconds: Math.ceil(WINDOW_SIZE_MS / 1000)
    });
  }

  // Record the current request timestamp
  timestamps.push(now);
  requestTracker.set(identifier, timestamps);

  next();
}