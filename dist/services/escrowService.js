"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeHold = storeHold;
exports.getAllHolds = getAllHolds;
exports.resolveTransaction = resolveTransaction;
const database_1 = require("../config/database");
async function storeHold(hold) {
    const db = await (0, database_1.getDB)();
    await db.run(`INSERT INTO holds (transactionId, payload, assessment, status, createdAt, agentName) VALUES (?, ?, ?, ?, ?, ?)`, [
        hold.transactionId,
        JSON.stringify(hold.payload),
        JSON.stringify(hold.assessment),
        hold.status,
        hold.createdAt,
        hold.payload._agentName || 'Unknown Agent'
    ]);
}
async function getAllHolds() {
    const db = await (0, database_1.getDB)();
    const rows = await db.all(`SELECT * FROM holds`);
    return rows.map((row) => ({
        transactionId: row.transactionId,
        payload: JSON.parse(row.payload),
        assessment: JSON.parse(row.assessment),
        status: row.status,
        createdAt: row.createdAt
    }));
}
async function resolveTransaction(transactionId, internalAction) {
    const db = await (0, database_1.getDB)();
    const newStatus = internalAction === 'CLEAR' ? 'APPROVED' : 'DENIED';
    const result = await db.run(`UPDATE holds SET status = ? WHERE transactionId = ?`, [newStatus, transactionId]);
    return result.changes !== undefined && result.changes > 0;
}
