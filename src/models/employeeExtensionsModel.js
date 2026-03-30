const db = require("../db");

// ADD EMPLOYEE EXTENSION
const addEmployeeExtension = async (
  employee_id,
  extension_number,
  permanent_flag
) => {
  const query = `
    INSERT INTO employee_extensions (employee_id, extension_number, permanent_flag)
    VALUES ($1, $2, $3)
    RETURNING id, employee_id, extension_number, permanent_flag
  `;
  const result = await db.query(query, [
    employee_id,
    extension_number,
    permanent_flag,
  ]);
  const employee_query = `UPDATE employees
    SET extension_number = $1
    WHERE id = $2`;
    
     await db.query(employee_query, [
    extension_number,
    employee_id,
  ]);
  return result.rows[0];
};

// GET EMPLOYEE EXTENSION BY EMPLOYEE ID
const getEmployeeExtensionById = async (employee_id) => {
  const query = `
    SELECT ee.*, 
      json_build_object('id', e.id, 'username', e.username) AS employee
    FROM employee_extensions ee
    LEFT JOIN employees e ON e.id = ee.employee_id
    WHERE ee.employee_id = $1
  `;
  const result = await db.query(query, [employee_id]);
  return result.rows;
};

// GET ALL EMPLOYEE EXTENSIONS
const getAllEmployeeExtensions = async () => {
  const query = `
    SELECT ee.*, 
      json_build_object('id', e.id, 'username', e.username) AS employee
    FROM employee_extensions ee
    LEFT JOIN employees e ON e.id = ee.employee_id
    ORDER BY ee.id DESC
  `;
  const result = await db.query(query);
  return result.rows;
};

// UPDATE EMPLOYEE EXTENSION (partial update support)
const updateEmployeeExtension = async (id, fields) => {
  const setClauses = [];
  const values = [];
  let index = 1;

  for (const key in fields) {
    if (fields[key] !== undefined) {
      // only include provided fields
      setClauses.push(`${key} = $${index}`);
      values.push(fields[key]);
      index++;
    }
  }

  if (setClauses.length === 0) return null; // nothing to update

  const query = `
    UPDATE employee_extensions
    SET ${setClauses.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;
  values.push(id);

  const result = await db.query(query, values);

  const updatedRow = result.rows[0];

  // ✅ OPTIONAL: sync with employees table
  if (updatedRow && fields.extension_number !== undefined) {
    await db.query(
      `UPDATE employees SET extension_number = $1 WHERE id = $2`,
      [fields.extension_number, updatedRow.employee_id]
    );
  }

  return updatedRow;
};

// DELETE EMPLOYEE EXTENSION
const deleteEmployeeExtension = async (id) => {
  const query = `DELETE FROM employee_extensions WHERE id = $1 RETURNING *`;
  const result = await db.query(query, [id]);

  if (result.rows.length === 0) {
    // agar delete ka record hi nahi mila
    throw new Error("Employee extension not found");
  }

  // agar mila aur delete hogaya
  return result.rows[0];
};

const getByEmployeeId = async (employee_id) => {
  const q = `
      SELECT ee.*, 
        json_build_object(
          'id', e.id,
          'username', e.username
        ) AS employee
      FROM employee_extensions ee
      LEFT JOIN employees e ON e.id = ee.employee_id
      WHERE ee.employee_id = $1
    `;
  const { rows } = await db.query(q, [employee_id]);
  return rows;
};
module.exports = {
  addEmployeeExtension,
  getEmployeeExtensionById,
  getAllEmployeeExtensions,
  updateEmployeeExtension,
  deleteEmployeeExtension,
  getByEmployeeId,
};
