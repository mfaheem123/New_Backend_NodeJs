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
const getAllLostProperties = async () => {
  const query = `
    SELECT 
      lp.id,
      lp.lost_number,
      lp.report_date,
      lp.lost_date,
      lp.item_description,
      c.name as customer_name
    FROM lost_properties lp
    LEFT JOIN customers c ON lp.customer_id = c.id
    ORDER BY lp.id DESC
  `;

  const { rows } = await db.query(query);
  return rows;
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
  const query = `
    UPDATE lost_properties SET
      booking_id=$1,
      customer_id=$2,
      item_description=$3,
      inquiry=$4,
      checked_by=$5,
      method_desposition=$6,
      result=$7,
      lost_date=$8
    WHERE id=$9
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
    id,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/* DELETE */
const deleteLostProperty = async (id) => {
  await db.query(`DELETE FROM lost_properties WHERE id=$1`, [id]);
  return true;
};

module.exports = {
  createLostProperty,
  getAllLostProperties,
  getLostPropertyById,
  updateLostProperty,
  deleteLostProperty,
};