const db = require("../db");

/* GENERATE LOST NUMBER */
const generateLostNumber = () => {
  return (
    Math.random().toString(36).substring(2, 4) +
    Date.now().toString().slice(-10)
  );
};

/* CREATE */
const createLostProperty = async (data) => {
  const lost_number = generateLostNumber();

  const query = `
    INSERT INTO lost_properties 
    (booking_id, customer_id, item_description, inquiry, checked_by, method_desposition, result, lost_date, report_date, lost_number)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `;

  const values = [
    data.booking_id,
    data.customer_id,
    data.item_description,
    data.inquiry,
    data.checked_by,
    data.method_desposition,
    data.result,
    data.lost_date,
    data.report_date,
    lost_number,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/* GET ALL */
const getAllLostProperties = async ({
  page = 1,
  limit = 100,
  lost_number,
  report_date,
  lost_date,
  item_description,
  name, // customer name
} = {}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (lost_number) {
    conditions.push(`lp.lost_number ILIKE $${idx++}`);
    params.push(`%${lost_number}%`);
  }

  if (report_date) {
    conditions.push(`lp.report_date = $${idx++}`);
    params.push(report_date);
  }

  if (lost_date) {
    conditions.push(`lp.lost_date = $${idx++}`);
    params.push(lost_date);
  }

  if (item_description) {
    conditions.push(`lp.item_description ILIKE $${idx++}`);
    params.push(`%${item_description}%`);
  }

  if (name) {
    conditions.push(`c.name ILIKE $${idx++}`);
    params.push(`%${name}%`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // 🔢 COUNT QUERY
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM lost_properties lp
    LEFT JOIN customers c ON lp.customer_id = c.id
    ${whereClause}
  `;

  const countResult = await db.query(countQuery, params);
  const total = Number(countResult.rows[0].total) || 0;

  // 📦 DATA QUERY
  params.push(limit, offset);

  const dataQuery = `
    SELECT 
      lp.id,
      lp.lost_number,
      lp.report_date,
      lp.lost_date,
      lp.item_description,
      c.name AS customer_name
    FROM lost_properties lp
    LEFT JOIN customers c ON lp.customer_id = c.id
    ${whereClause}
    ORDER BY lp.id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await db.query(dataQuery, params);

  return {
    lost_properties: rows,
    total,
  };
};

/* GET BY ID */
const getLostPropertyById = async (id) => {
  const query = `
    SELECT 
      lp.*,
      b.reference_number,
      b.pickup_date,
      b.pickup_time,
      b.pickup,
      b.dropoff,
      vt.name as vehicle_type_name,
      c.name as customer_name,
      c.mobile,
      c.door_number,
      c.address1,
      c.address2
    FROM lost_properties lp
    LEFT JOIN bookings b ON lp.booking_id = b.id
    LEFT JOIN vehicle_types vt ON b.vehicle_type_id = vt.id
    LEFT JOIN customers c ON lp.customer_id = c.id
    WHERE lp.id = $1
  `;

  const { rows } = await db.query(query, [id]);
  return rows[0];
};

/* UPDATE */
const updateLostProperty = async (id, data) => {
  const fields = [];
  const values = [];
  let index = 1;

  for (const key in data) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${index}`);
      values.push(data[key]);
      index++;
    }
  }

  // Agar koi field hi nahi bheji
  if (fields.length === 0) {
    throw new Error("No fields provided to update");
  }

  const query = `
    UPDATE lost_properties
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;

  values.push(id);

  const { rows } = await db.query(query, values);
  return rows[0];
};

/* DELETE */
const deleteLostProperty = async (id) => {
  const q = `DELETE FROM lost_properties WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(q, [id]);
    return rows[0] || null;
  
};

module.exports = {
  createLostProperty,
  getAllLostProperties,
  getLostPropertyById,
  updateLostProperty,
  deleteLostProperty,
};
