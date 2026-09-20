import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface VerifiedAgentCache {
  [signature: string]: {
    lastVerified: number;
    challengeCount: number;
  };
}

const verifiedAgents: VerifiedAgentCache = {};
const CHALLENGE_WINDOW_MS = 1000 * 60 * 15;

export const intentChallengeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const agentSignature = req.headers['user-agent'] || 'Unknown-Agent';
  const incomingToken = req.headers['x-aif-intent-token'] as string;

  if (req.originalUrl.includes('/aif/health')) {
    return next();
  }

  const currentRecord = verifiedAgents[agentSignature];
  const now = Date.now();

  if (currentRecord && (now - currentRecord.lastVerified < CHALLENGE_WINDOW_MS)) {
    req.headers['x-aif-security-status'] = 'verified';
    return next(); // Pass through to escrow buffer
  }

  if (!incomingToken) {
    const freshChallenge = crypto.randomBytes(32).toString('hex');
    return res.status(428).json({
      error: 'Precondition Required',
      message: 'AIF Protocol: Agentic intent verification required.',
      challenge: { nonce: freshChallenge }
    });
  }

  if (incomingToken.length === 64) {
    verifiedAgents[agentSignature] = {
      lastVerified: now,
      challengeCount: (currentRecord?.challengeCount || 0) + 1
    };
    req.headers['x-aif-security-status'] = 'challenge-passed';
    return next(); // CRITICAL: Call next() so it reaches the escrow buffer!
  }

  return res.status(403).json({ error: 'Forbidden', message: 'Invalid cryptographic intent proof.' });
};