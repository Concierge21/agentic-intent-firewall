"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.abortTransaction = exports.parkTransaction = void 0;
const crypto_1 = __importDefault(require("crypto"));
const auditLogger_1 = require("./auditLogger");
const escrowStore = {};
const parkTransaction = (action, items, intentToken, riskAssessment) => {
    const transactionId = `txn_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
    const timeoutId = setTimeout(() => {
        console.log(`[Escrow Executed] Timer expired for ${transactionId}. Upstream cleared.`);
        (0, auditLogger_1.logAuditEvent)({
            eventType: 'TRANSACTION_EXECUTED',
            transactionId,
            payload: { action, items }
        });
        delete escrowStore[transactionId];
    }, 60000);
    escrowStore[transactionId] = { action, items, timeoutId };
    (0, auditLogger_1.logAuditEvent)({
        eventType: 'CHECKOUT_ESCROWED',
        transactionId,
        intentToken,
        riskAssessment,
        payload: { action, items }
    });
    return transactionId;
};
exports.parkTransaction = parkTransaction;
const abortTransaction = (transactionId) => {
    const transaction = escrowStore[transactionId];
    if (!transaction)
        return false;
    clearTimeout(transaction.timeoutId);
    delete escrowStore[transactionId];
    (0, auditLogger_1.logAuditEvent)({
        eventType: 'TRANSACTION_ABORTED',
        transactionId,
        payload: { action: transaction.action, items: transaction.items }
    });
    return true;
};
exports.abortTransaction = abortTransaction;
