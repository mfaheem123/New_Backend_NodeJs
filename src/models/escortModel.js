const db = require("../db");

const Escort = {
  async create(data) {
    const query = `
      INSERT INTO escorts (
        name, dob, email, mobile, address, active,
        image, safeguarding_document, pat_document, firstaid_document, dbs_document,
        safeguarding_number, pat_number, firstaid_number, dbs_number,
        safeguarding_expiry, pat_expiry, firstaid_expiry, dbs_expiry
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,$19
      )
      RETURNING *;
    `;
    const values = [
      data.name,
      data.dob,
      data.email,
      data.mobile,
      data.address,
      data.active,
      data.image,
      data.safeguarding_document,
      data.pat_document,
      data.firstaid_document,
      data.dbs_document,
      data.safeguarding_number,
      data.pat_number,
      data.firstaid_number,
      data.dbs_number,
      data.safeguarding_expiry,
      data.pat_expiry,
      data.firstaid_expiry,
      data.dbs_expiry,
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  async findAll({
    page = 1,
    limit = 10,
    name,
    safeguarding_expiry,
    pat_expiry,
    firstaid_expiry,
    dbs_expiry,
  }) {
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    // Dynamic search conditions
    if (name) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${name}%`);
    }
    if (safeguarding_expiry) {
      conditions.push(`safeguarding_expiry ILIKE $${idx++}`);
      values.push(`%${safeguarding_expiry}%`);
    }
    if (pat_expiry) {
      conditions.push(`pat_expiry ILIKE $${idx++}`);
      values.push(`%${pat_expiry}%`);
    }
    if (firstaid_expiry) {
      conditions.push(`firstaid_expiry ILIKE $${idx++}`);
      values.push(`%${firstaid_expiry}%`);
    }
    if (dbs_expiry) {
      conditions.push(`dbs_expiry ILIKE $${idx++}`);
      values.push(`%${dbs_expiry}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // --- Count Query ---
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM escorts
    ${whereClause};
  `;
    const countResult = await db.query(countQuery, values);
    const total = Number(countResult.rows[0].total);

    // --- Main Data Query ---
    values.push(offset, limit);
    const query = `
    SELECT *
    FROM escorts
    ${whereClause}
    ORDER BY id DESC
    OFFSET $${values.length - 1} LIMIT $${values.length};
  `;
    const { rows } = await db.query(query, values);

    return { escorts: rows, total };
  },

  async findById(id) {
    const { rows } = await db.query(`SELECT * FROM escorts WHERE id = $1`, [
      id,
    ]);
    return rows[0];
  },

  async update(id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    const setClause = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
    const values = Object.values(data);

    const query = `
      UPDATE escorts
      SET ${setClause}, updated_at = now()
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;
    const { rows } = await db.query(query, [...values, id]);
    return rows[0];
  },

  async remove(id) {
    const result = await db.query("DELETE FROM escorts WHERE id = $1", [id]);

    return result;
  },
};

module.exports = Escort;
