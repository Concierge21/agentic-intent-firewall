import { getDB } from '../config/database';

export async function storeHold(hold: any) {
  const db = await getDB();
  await db.run(
    `INSERT INTO holds (transactionId, payload, assessment, status, createdAt, agentName) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      hold.transactionId,
      JSON.stringify(hold.payload),
      JSON.stringify(hold.assessment),
      hold.status,
      hold.createdAt,
      hold.payload._agentName || 'Unknown Agent'
    ]
  );
}

export async function getAllHolds() {
  const db = await getDB();
  const rows = await db.all(`SELECT * FROM holds`);
  return rows.map((row: any) => ({
    transactionId: row.transactionId,
    payload: JSON.parse(row.payload),
    assessment: JSON.parse(row.assessment),
    status: row.status,
    createdAt: row.createdAt
  }));
}

export async function resolveTransaction(transactionId: string, internalAction: string) {
  const db = await getDB();
  const newStatus = internalAction === 'CLEAR' ? 'APPROVED' : 'DENIED';
  
  const result = await db.run(
    `UPDATE holds SET status = ? WHERE transactionId = ?`,
    [newStatus, transactionId]
  );
  
  return result.changes !== undefined && result.changes > 0;
}