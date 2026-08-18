const db = require("../db");

class CallRecordingModel {
  static async create(data) {
    const query = `
      INSERT INTO call_recordings (
        company_id, authentication_token, event_type, recording_id, call_id,
        duration, recording_datetime, source, destination, is_protected,
        filename, file_path, remote_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      data.company_id,
      data.token || null,
      data.event_type || null,
      data.recording_id || null,
      data.call_id || null,
      data.duration ? parseInt(data.duration, 10) : null,
      data.datetime ? new Date(data.datetime) : null,
      data.source || null,
      data.destination || null,
      data.is_protected === "true" || data.is_protected === true,
      data.filename || null,
      data.file_path || null,
      data.url || null,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = CallRecordingModel;
