const db = require("../db");

async function createComplaint(data) {
  const {
    complain_date,
    incident_date,
    customer_id,
    booking_id,
    complaint,
    dealt_with,
    result,
    driver_id,
    employee_id,
    account_id,
  } = data;

  const query = `
INSERT INTO complaints(
complain_date,
incident_date,
customer_id,
booking_id,
complaint,
dealt_with,
result,
driver_id,
employee_id,
account_id
)
VALUES(
$1,$2,$3,$4,$5,$6,$7,$8,$9,$10
)
RETURNING *;
`;

  const values = [
    complain_date,
    incident_date,
    customer_id,
    booking_id,
    complaint,
    dealt_with,
    result,
    driver_id,
    employee_id,
    account_id,
  ];

  const resultDB = await db.query(query, values);

  return resultDB.rows[0];
}

async function getAllComplaints(offset, limit) {
  const query = `
SELECT
c.*,

json_build_object(
'name',cu.name
) customer,

json_build_object(
'reference_number',b.reference_number,
'notes',b.notes
) booking

FROM complaints c

LEFT JOIN customers cu
ON cu.id=c.customer_id

LEFT JOIN bookings b
ON b.id=c.booking_id

ORDER BY c.id DESC
OFFSET $1
LIMIT $2
`;

  const result = await db.query(query, [offset, limit]);

  return result.rows;
}

async function getComplaintById(id) {
  const query = `
SELECT
c.*,

json_build_object(
'name',cu.name,
'mobile',cu.mobile,
'door_number',cu.door_number,
'address1',cu.address1,
'address2',cu.address2
) customer,

json_build_object(
'reference_number',b.reference_number,
'notes',b.notes,
'pickup',b.pickup,
'dropoff',b.dropoff
) booking

FROM complaints c

LEFT JOIN customers cu
ON cu.id=c.customer_id

LEFT JOIN bookings b
ON b.id=c.booking_id

WHERE c.id=$1
`;

  const result = await db.query(query, [id]);

  return result.rows[0];
}

async function updateComplaint(id, body) {
  const query = `
UPDATE complaints
SET
complain_date = COALESCE($1, complain_date),
incident_date = COALESCE($2, incident_date),

customer_id = COALESCE($3, customer_id),
booking_id = COALESCE($4, booking_id),

complaint = COALESCE($5, complaint),
dealt_with = COALESCE($6, dealt_with),
result = COALESCE($7, result),

driver_id = COALESCE($8, driver_id),
employee_id = COALESCE($9, employee_id),
account_id = COALESCE($10, account_id),

updated_at = NOW()

WHERE id=$11

RETURNING *
`;

  const values = [
    body.complain_date ?? null,
    body.incident_date ?? null,

    body.customer_id ?? null,
    body.booking_id ?? null,

    body.complaint ?? null,
    body.dealt_with ?? null,
    body.result ?? null,

    body.driver_id ?? null,
    body.employee_id ?? null,
    body.account_id ?? null,

    id,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

async function deleteComplaint(id) {
  const result = await db.query(
    `
DELETE FROM complaints
WHERE id=$1
RETURNING id
`,
    [id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

module.exports = {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
};
