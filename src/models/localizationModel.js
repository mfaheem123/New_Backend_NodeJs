const pool = require("../db");

const Localization = {
  getAll: async () => {
    const result = await pool.query(
      "SELECT * FROM localizations ORDER BY id DESC",
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      "SELECT * FROM localizations WHERE id = $1",
      [id],
    );
    return result.rows[0];
  },

  create: async (data) => {
    const { postcode, localization_order_no } = data;
    const result = await pool.query(
      `INSERT INTO localizations (postcode, localization_order_no)
       VALUES ($1, $2)
       RETURNING *`,
      [postcode, localization_order_no],
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];
    let i = 1;

    for (const key in data) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(data[key]);
        i++;
      }
    }

    if (fields.length === 0) return await Localization.getById(id);

    values.push(id);

    const query = `
      UPDATE localizations
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  delete: async (id) => {
    await pool.query("DELETE FROM localizations WHERE id = $1", [id]);
    return true;
  },
};

module.exports = Localization;
