"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escrowManager = void 0;
const auditLogger_1 = require("./auditLogger");
class EscrowStateMachine {
    transactions = new Map();
    create(id, payload, riskAssessment, ttlSeconds = 30) {
        const createdAt = Date.now();
        const expiresAt = createdAt + (ttlSeconds * 1000);
        const transaction = {
            id,
            state: 'ESCROWED',
            payload,
            riskAssessment,
            createdAt,
            expiresAt
        };
        transaction.timer = setTimeout(() => {
            this.expire(id);
        }, ttlSeconds * 1000);
        this.transactions.set(id, transaction);
        return transaction;
    }
    get(id) {
        return this.transactions.get(id);
    }
    getAll() {
        return Array.from(this.transactions.values()).filter(t => t.state === 'ESCROWED');
    }
    transition(id, targetState) {
        const txn = this.transactions.get(id);
        if (!txn || txn.state !== 'ESCROWED') {
            return null;
        }
        if (txn.timer) {
            clearTimeout(txn.timer);
        }
        txn.state = targetState;
        this.transactions.delete(id);
        return txn;
    }
    expire(id) {
        const txn = this.transactions.get(id);
        if (txn && txn.state === 'ESCROWED') {
            txn.state = 'EXPIRED';
            console.log(`⏰ [Escrow Machine] Transaction ${id} expired automatically after TTL.`);
            (0, auditLogger_1.logAuditEvent)({
                eventType: 'CHECKOUT_BLOCKED',
                transactionId: id,
                riskAssessment: txn.riskAssessment,
                payload: txn.payload
            });
            this.transactions.delete(id);
        }
    }
}
exports.escrowManager = new EscrowStateMachine();
