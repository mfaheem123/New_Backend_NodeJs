const pool = require("../db");

const COLUMNS = [
  "name",
  "location_type_id",
  "address",
  "postcode",
  "zone_id",
  "shortcut",
  "background_color",
  "foreground_color",
  "extra_charges",
  "pickup_charges",
  "dropoff_charges",
  "blacklist",
  "latitude",
  "longitude",
  "company_id",
];

// Get all locations with location_type + zone details
const getAll = async ({
  page = 1,
  limit = 10,
  name,
  postcode,
  shortcut,
  address,
  location_type,
  zone,
  company_id,
  blacklist
}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  // 🔍 Dynamic filters
  if (name) {
    conditions.push(`l.name ILIKE $${idx++}`);
    params.push(`%${name}%`);
  }
  if (postcode) {
    conditions.push(`l.postcode ILIKE $${idx++}`);
    params.push(`%${postcode}%`);
  }
  if (shortcut) {
    conditions.push(`l.shortcut ILIKE $${idx++}`);
    params.push(`%${shortcut}%`);
  }
  if (address) {
    conditions.push(`l.address ILIKE $${idx++}`);
    params.push(`%${address}%`);
  }
  if (location_type) {
    conditions.push(`lt.name ILIKE $${idx++}`);
    params.push(`%${location_type}%`);
  }
  if (zone) {
    conditions.push(`z.name ILIKE $${idx++}`);
    params.push(`%${zone}%`);
  }
  if (company_id) {
    conditions.push(`l.company_id = $${idx++}`);
    params.push(company_id);
  }
  if (blacklist) {
    conditions.push(`l.blacklist = $${idx++}`);
    params.push(blacklist);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // --- Count Query (for pagination) ---
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM locations l
    LEFT JOIN location_types lt ON l.location_type_id = lt.id
    LEFT JOIN zones z ON l.zone_id = z.id
    ${whereClause};
  `;
  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0].total) || 0;

  // --- Data Query ---
  params.push(limit, offset);
  const dataQuery = `
    SELECT 
      l.id,
l.name,
l.location_type_id,
l.address,
l.postcode,
l.zone_id,
l.shortcut,
l.background_color,
l.foreground_color,
l.extra_charges,
l.pickup_charges,
l.dropoff_charges,
l.blacklist,
l.latitude,
l.longitude, 
      jsonb_build_object(
        'id', lt.id,
        'name', lt.name,
        'shortcut', lt.shortcut,
        'background_color', lt.background_color,
        'foreground_color', lt.foreground_color
      ) AS location_type,
      z.name AS zone
    FROM locations l
    LEFT JOIN location_types lt ON l.location_type_id = lt.id
    LEFT JOIN zones z ON l.zone_id = z.id
    ${whereClause}
    ORDER BY l.id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length};
  `;
  const { rows } = await pool.query(dataQuery, params);

  return { locations: rows, total };
};

// Get single location
const getById = async (id) => {
  const q = `
    SELECT 
      l.*, 
      jsonb_build_object(
        'id', lt.id,
        'name', lt.name,
        'shortcut', lt.shortcut,
        'background_color', lt.background_color,
        'foreground_color', lt.foreground_color
      ) AS location_type,
      CASE WHEN z.id IS NOT NULL THEN
        jsonb_build_object(
          'id', z.id,
          'name', z.name,
          'secondary_name', z.secondary_name,
          'type', z.type,
          'category', z.category,
          'vertices', z.vertices,
          'base', z.base,
          'overlay', z.overlay
        )
      ELSE NULL END AS zone
    FROM locations l
    LEFT JOIN location_types lt ON l.location_type_id = lt.id
    LEFT JOIN zones z ON l.zone_id = z.id
    WHERE l.id = $1;
  `;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
};

// Create location
const create = async (data) => {
  const cols = COLUMNS.filter((c) => data[c] !== undefined);
  const values = cols.map((c) => data[c]);
  const params = values.map((_, i) => `$${i + 1}`).join(",");
  const q = `INSERT INTO locations (${cols.join(
    ",",
  )}) VALUES (${params}) RETURNING *`;
  const { rows } = await pool.query(q, values);
  const location = rows[0];
  // ❌ Remove company_id
  const { company_id, ...rest } = location;

  return rest;
};

// Update location
const update = async (id, data) => {
  const cols = COLUMNS.filter((c) => data[c] !== undefined);
  if (cols.length === 0) return await getById(id);
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map((c) => data[c]);
  values.push(id);
  const q = `UPDATE locations SET ${set} WHERE id = $${values.length} RETURNING *`;
  const { rows } = await pool.query(q, values);
  return rows[0] || null;
};

// Delete location
const remove = async (id) => {
  const q = `DELETE FROM locations WHERE id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
};

module.exports = { getAll, getById, create, update, remove };
