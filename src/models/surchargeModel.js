const pool = require("../db");

module.exports = {
  async create(data) {
    const query = `
      INSERT INTO surcharges (
        surcharges_type, condition, postcode, operator, fare, parking_charges,
        extra_drop_charges, congestion_charges, duration, from_date, from_time,
        to_date, to_time, active, day
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id,
                TO_CHAR(from_date, 'DD-MM-YYYY') AS from_date,
                TO_CHAR(to_date, 'DD-MM-YYYY') AS to_date,
                surcharges_type, condition, postcode, operator, fare, parking_charges,
                extra_drop_charges, congestion_charges, duration,from_time, to_time, active, day;
    `;

    const values = [
      data.surcharges_type,
      data.condition,
      data.postcode,
      data.operator,
      data.fare,
      data.parking_charges,
      data.extra_drop_charges,
      data.congestion_charges,
      data.duration,
      data.from_date,
      data.from_time,
      data.to_date,
      data.to_time,
      data.active,
      data.day,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

    async update(id, data) {
    // Keys & Values extract karein
    const fields = [];
    const values = [];

    let index = 1;

    for (const key in data) {
      fields.push(`${key} = $${index}`);
      values.push(data[key]);
      index++;
    }

    // agar koi field hi nahi ayi
    if (fields.length === 0) {
      throw new Error("No fields provided for update");
    }

    const query = `
      UPDATE surcharges
      SET ${fields.join(", ")},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $${index}
      RETURNING 
        id,
        TO_CHAR(from_date, 'DD-MM-YYYY') AS from_date,
        TO_CHAR(to_date, 'DD-MM-YYYY') AS to_date,
        surcharges_type, condition, postcode, operator, fare, parking_charges,
        extra_drop_charges, congestion_charges, duration, from_time, to_time,
        active, day, created_at, updated_at;
    `;

    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      "DELETE FROM surcharges WHERE id=$1 RETURNING id;",
      [id]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await pool.query(
      `SELECT id,
                TO_CHAR(from_date, 'DD-MM-YYYY') AS from_date,
                TO_CHAR(to_date, 'DD-MM-YYYY') AS to_date,
                surcharges_type, condition, postcode, operator, fare, parking_charges,
                extra_drop_charges, congestion_charges, duration,from_time, to_time, active, day, created_at, updated_at FROM surcharges ORDER BY id ASC;`
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query("SELECT * FROM surcharges WHERE id=$1;", [
      id,
    ]);
    return result.rows[0];
  },

  async updateActive(id, active) {
  const query = `
    UPDATE surcharges
    SET active = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING 
      id,
        TO_CHAR(from_date, 'DD-MM-YYYY') AS from_date,
        TO_CHAR(to_date, 'DD-MM-YYYY') AS to_date,
        surcharges_type, condition, postcode, operator, fare, parking_charges,
        extra_drop_charges, congestion_charges, duration, from_time, to_time,
        active, day, created_at, updated_at;
  `;

  const result = await pool.query(query, [active, id]);
  return result.rows[0];
},

};

