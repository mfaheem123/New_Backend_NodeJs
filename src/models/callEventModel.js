const db = require("../db");

// Create Batch
const createBatch = async (token) => {
  const result = await db.query(
    `INSERT INTO call_event_batches (token)
     VALUES ($1)
     RETURNING id`,
    [token],
  );
  return result.rows[0].id;
};

// ✅ INSERT SINGLE EVENT (IMPORTANT)
const insertSingleEvent = async (batchId, e) => {
  const result = await db.query(
    `
    INSERT INTO call_events
    (batch_id, call_id, dialled_number, extension, caller_id, status, event_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
    [
      batchId,
      e.callId || "",
      e.dialledNumber || "",
      e.extension,
      e.callerId || "",
      e.status,
      e.time,
    ],
  );

  return result.rows[0];
};

// ✅ MARK CLI TRIGGERED
const markCliTriggered = async (id) => {
  await db.query(`UPDATE call_events SET cli_triggered = true WHERE id = $1`, [
    id,
  ]);
};

// Get Events By Token
const getEventsByToken = async (token) => {
  const result = await db.query(
    `
    SELECT b.token, e.*
    FROM call_event_batches b
    JOIN call_events e ON e.batch_id = b.id
    WHERE b.token = $1
    ORDER BY e.id DESC
    `,
    [token],
  );
  return result.rows;
};

// Delete Events By Token
const deleteEventsByToken = async (token) => {
  const result = await db.query(
    `DELETE FROM call_event_batches WHERE token = $1`,
    [token],
  );
  return result.rowCount;
};

const getCompanyIdByCallEvent= async (number) =>{
  const result = await db.query(
    `
    SELECT id
    FROM company_clients
    WHERE mobile = $1
    AND status='active'
    LIMIT 1
    `,
    [number]
  );

  return result.rows[0]?.id || null;
}

module.exports = {
  createBatch,
  insertSingleEvent,
  markCliTriggered,
  getEventsByToken,
  deleteEventsByToken,
  getCompanyIdByCallEvent
};
