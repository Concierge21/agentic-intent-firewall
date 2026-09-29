"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAIF = initAIF;
const riskEngine_1 = require("./middleware/riskEngine");
const validatePayload_1 = require("./middleware/validatePayload");
const rateLimiter_1 = require("./middleware/rateLimiter");
const circuitBreaker_1 = require("./middleware/circuitBreaker");
const policyEngine_1 = require("./middleware/policyEngine");
const escrowMachine_1 = require("./services/escrowMachine");
const auditLogger_1 = require("./services/auditLogger");
function initAIF(options = {}) {
    if (options.enableHotReload !== false) {
        (0, policyEngine_1.loadPolicy)();
        (0, policyEngine_1.watchPolicy)();
    }
    return {
        circuitBreaker: circuitBreaker_1.circuitBreaker,
        rateLimiter: rateLimiter_1.rateLimiter,
        validateCheckoutPayload: validatePayload_1.validateCheckoutPayload,
        riskScoringMiddleware: riskEngine_1.riskScoringMiddleware,
        escrowManager: escrowMachine_1.escrowManager,
        logAuditEvent: auditLogger_1.logAuditEvent
    };
}
__exportStar(require("./services/escrowMachine"), exports);
__exportStar(require("./services/auditLogger"), exports);
