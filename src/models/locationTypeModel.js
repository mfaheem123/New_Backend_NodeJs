const pool = require("../db");

const LocationType = {
  create: async (data) => {
    const query = `INSERT INTO location_types (name, shortcut, background_color, foreground_color)
                   VALUES ($1, $2, $3, $4) RETURNING *`;
    const values = [
      data.name,
      data.shortcut,
      data.background_color,
      data.foreground_color,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  getAll: async () => {
    const result = await pool.query("SELECT * FROM location_types");
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      "SELECT * FROM location_types WHERE id = $1",
      [id],
    );
    return result.rows[0];
  },

  //UPDATE ALL FIELDS
  // update: async (id, data) => {
  //   const query = `UPDATE location_types SET name=$1, shortcut=$2, background_color=$3, foreground_color=$4
  //                  WHERE id=$5 RETURNING *`;
  //   const values = [data.name, data.shortcut, data.background_color, data.foreground_color, id];
  //   const result = await pool.query(query, values);
  //   return result.rows[0];
  // },

  //UPDATE SELECTED FIELDS
  // update: async (id, data) => {
  //   const fields = [];
  //   const values = [];
  //   let index = 1;

  //   for (let key in data) {
  //     fields.push(`${key}=$${index}`);
  //     values.push(data[key]);
  //     index++;
  //   }

  //   values.push(id);

  //   const query = `UPDATE location_types SET ${fields.join(
  //     ", "
  //   )} WHERE id=$${index} RETURNING *`;
  //   const result = await pool.query(query, values);
  //   return result.rows[0];
  // }

  update: async (id, data) => {
    const fields = [];
    const values = [];
    let index = 1;

    for (let key in data) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        fields.push(`${key}=$${index}`);
        values.push(data[key]);
        index++;
      }
    }

    if (fields.length === 0) {
      throw new Error("No valid fields provided for update");
    }

    values.push(id);

    const query = `
    UPDATE location_types 
    SET ${fields.join(", ")} 
    WHERE id=$${index} 
    RETURNING *
  `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await pool.query(
      "DELETE FROM location_types WHERE id=$1 RETURNING *",
      [id],
    );
    return result.rows[0];
  },
};

module.exports = LocationType;
