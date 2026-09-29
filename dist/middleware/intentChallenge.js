"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentChallengeMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const verifiedAgents = {};
const CHALLENGE_WINDOW_MS = 1000 * 60 * 15;
const intentChallengeMiddleware = (req, res, next) => {
    const agentSignature = req.headers['user-agent'] || 'Unknown-Agent';
    const incomingToken = req.headers['x-aif-intent-token'];
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
        const freshChallenge = crypto_1.default.randomBytes(32).toString('hex');
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
exports.intentChallengeMiddleware = intentChallengeMiddleware;
