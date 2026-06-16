const db = require("../db");

const CompanyVehicle = {
  // 🔹 Create vehicle
  async create(data) {
    const query = `
      INSERT INTO company_vehicles (
        vehicle_number, make, model, color, owner, company, assigned,
        vehicle_type_id, log_book_number, phc_vehicle_number, mot_number,
        mot2_number, insurance_number, phc_vehicle_expiry, mot_expiry,
        mot2_expiry, insurance_expiry, log_book_document, phc_vehicle_document,
        mot_document, mot2_document, insurance_document, start_date, end_date, phc_vehicle_expiry_time, mot_expiry_time, mot2_expiry_time, insurance_expiry_time, company_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29
      )
      RETURNING *;
    `;
    const values = [
      data.vehicle_number,
      data.make,
      data.model,
      data.color,
      data.owner,
      data.company,
      data.assigned,
      data.vehicle_type_id,
      data.log_book_number,
      data.phc_vehicle_number,
      data.mot_number,
      data.mot2_number,
      data.insurance_number,
      data.phc_vehicle_expiry,
      data.mot_expiry,
      data.mot2_expiry,
      data.insurance_expiry,
      data.log_book_document,
      data.phc_vehicle_document,
      data.mot_document,
      data.mot2_document,
      data.insurance_document,
      data.start_date,
      data.end_date,
      data.phc_vehicle_expiry_time,
      data.mot_expiry_time,
      data.mot2_expiry_time,
      data.insurance_expiry_time,
      data.company_id,
    ];
    const { rows } = await db.query(query, values);
    const { company_id, ...vehicle } = rows[0]; // ❌ remove only company_id

    return vehicle;
  },

  // 🔹 Get all vehicles
  async findAll({
    page = 1,
    limit = 10,
    owner,
    vehicle_number,
    vehicle_type,
    make,
    model,
    color,
    company_id,
  }) {
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    // --- Filtering conditions dynamically ---
    if (owner) {
      conditions.push(`cv.owner = $${idx++}`);
      values.push(owner);
    }
    if (vehicle_number) {
      conditions.push(`cv.vehicle_number ILIKE $${idx++}`);
      values.push(`%${vehicle_number}%`);
    }
    if (vehicle_type) {
      conditions.push(`vt.name ILIKE $${idx++}`);
      values.push(`%${vehicle_type}%`);
    }
    if (make) {
      conditions.push(`cv.make ILIKE $${idx++}`);
      values.push(`%${make}%`);
    }
    if (model) {
      conditions.push(`cv.model ILIKE $${idx++}`);
      values.push(`%${model}%`);
    }
    if (color) {
      conditions.push(`cv.color ILIKE $${idx++}`);
      values.push(`%${color}%`);
    }
    if (company_id) {
      conditions.push(`cv.company_id = $${idx++}`);
      values.push(company_id);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // --- Count query ---
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM company_vehicles cv
    LEFT JOIN vehicle_types vt ON cv.vehicle_type_id = vt.id
    ${whereClause};
  `;
    const countResult = await db.query(countQuery, values);
    const total = Number(countResult.rows[0].total);

    // --- Data query ---
    values.push(offset, limit);
    const query = `
    SELECT cv.*, vt.id AS vehicle_type_id, vt.name AS vehicle_type_name
    FROM company_vehicles cv
    LEFT JOIN vehicle_types vt ON cv.vehicle_type_id = vt.id
    ${whereClause}
    ORDER BY cv.id DESC
    OFFSET $${values.length - 1} LIMIT $${values.length};
  `;
    const { rows } = await db.query(query, values);

    const vehicles = rows.map((r) => {
      const { company_id, ...rest } = r; // ❌ remove only company_id

      return {
        ...rest,
        vehicle_type: {
          id: r.vehicle_type_id,
          name: r.vehicle_type_name,
        },
      };
    });

    return { vehicles, total };
  },

  // 🔹 Find by ID
  async findById(id) {
    const { rows } = await db.query(
      `SELECT * FROM company_vehicles WHERE id = $1`,
      [id],
    );
    return rows[0];
  },

  // 🔹 Find by vehicle number
  async findByVehicleNumber(vehicle_number) {
    const { rows } = await db.query(
      `SELECT * FROM company_vehicles WHERE vehicle_number = $1 LIMIT 1`,
      [vehicle_number],
    );
    return rows[0];
  },

  // 🔹 Update vehicle
  async update(id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    const setClause = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
    const values = Object.values(data);

    const query = `
      UPDATE company_vehicles
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;
    const { rows } = await db.query(query, [...values, id]);
    return rows[0];
  },

  // 🔹 Delete vehicle
  async remove(id) {
    const result = await db.query(
      `DELETE FROM company_vehicles WHERE id = $1 RETURNING *`,
      [id],
    );
    return result.rowCount > 0; // agar koi row delete hui to true, warna false
  },
};

module.exports = CompanyVehicle;
