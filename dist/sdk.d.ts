import { riskScoringMiddleware } from './middleware/riskEngine';
import { validateCheckoutPayload } from './middleware/validatePayload';
import { rateLimiter } from './middleware/rateLimiter';
import { circuitBreaker } from './middleware/circuitBreaker';
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
export declare function initAIF(options?: AIFOptions): AIFInstance;
export * from './services/escrowMachine';
export * from './services/auditLogger';
