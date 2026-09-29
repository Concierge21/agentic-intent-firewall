"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllHolds = exports.getTransaction = exports.resolveTransaction = exports.storeHold = exports.holdTransaction = void 0;
const escrowBuffer = new Map();
const holdTransaction = (transactionId, payload, holdTimeMs = 30000) => {
    escrowBuffer.set(transactionId, {
        transactionId,
        payload,
        expiresAt: Date.now() + holdTimeMs,
        status: 'ESCROW_HOLD',
        createdAt: Date.now(),
    });
    console.log(`⏸️ [Escrow] Transaction ${transactionId} held in ESCROW_HOLD state.`);
};
exports.holdTransaction = holdTransaction;
// Compatibility wrapper for server.ts storeHold calls
const storeHold = (hold) => {
    escrowBuffer.set(hold.transactionId, {
        transactionId: hold.transactionId,
        payload: hold.payload,
        assessment: hold.assessment,
        expiresAt: Date.now() + 30000,
        status: 'ESCROW_HOLD',
        createdAt: hold.createdAt || Date.now(),
    });
    console.log(`⏸️ [Escrow] Transaction ${hold.transactionId} stored in ESCROW_HOLD state.`);
};
exports.storeHold = storeHold;
const resolveTransaction = (transactionId, action) => {
    const tx = escrowBuffer.get(transactionId);
    // Prevent modifying transactions that are already cleared, aborted, or missing
    if (!tx || tx.status !== 'ESCROW_HOLD') {
        console.log(`⚠️ [Escrow] Cannot ${action} transaction ${transactionId}. Current status: ${tx?.status || 'NOT_FOUND'}`);
        return false;
    }
    tx.status = action === 'CLEAR' ? 'CLEARED' : 'ABORTED';
    console.log(`✅ [Escrow] Transaction ${transactionId} transitioned to ${tx.status}.`);
    return true;
};
exports.resolveTransaction = resolveTransaction;
const getTransaction = (transactionId) => {
    return escrowBuffer.get(transactionId);
};
exports.getTransaction = getTransaction;
const getAllHolds = () => {
    return Array.from(escrowBuffer.values()).filter(tx => tx.status === 'ESCROW_HOLD');
};
exports.getAllHolds = getAllHolds;
