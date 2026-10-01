"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreaker = void 0;
exports.recordFailure = recordFailure;
exports.resetBreaker = resetBreaker;
exports.circuitBreakerMiddleware = circuitBreakerMiddleware;
const failedAttempts = {};
const MAX_FAILURES = 3;
function recordFailure(agentName) {
    if (!failedAttempts[agentName])
        failedAttempts[agentName] = 0;
    failedAttempts[agentName]++;
    console.log(`⚠ [Circuit Breaker] ${agentName} strike ${failedAttempts[agentName]}/${MAX_FAILURES}`);
}
function resetBreaker(agentName) {
    if (failedAttempts[agentName]) {
        failedAttempts[agentName] = 0;
        console.log(`✅ [Circuit Breaker] Reset for ${agentName}`);
    }
}
function circuitBreakerMiddleware(req, res, next) {
    const agent = req.agent;
    if (!agent)
        return next();
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
exports.circuitBreaker = circuitBreakerMiddleware;
