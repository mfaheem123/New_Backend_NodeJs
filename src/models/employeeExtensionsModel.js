const db = require("../db");

// ADD EMPLOYEE EXTENSION
const addEmployeeExtension = async (employee_id, extension_number, permanent_flag) => {
  const query = `
    INSERT INTO employee_extensions (employee_id, extension_number, permanent_flag)
    VALUES ($1, $2, $3)
    RETURNING id, employee_id, extension_number, permanent_flag
  `;
  const result = await db.query(query, [employee_id, extension_number, permanent_flag]);
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

// UPDATE EMPLOYEE EXTENSION
const updateEmployeeExtension = async (id, extension_number, permanent_flag) => {
  const query = `
    UPDATE employee_extensions 
    SET extension_number = $1,
        permanent_flag = $2
    WHERE id = $3
    RETURNING *
  `;
  const result = await db.query(query, [extension_number, permanent_flag, id]);
  return result.rows[0];
};

// DELETE EMPLOYEE EXTENSION
const deleteEmployeeExtension = async (id) => {
  const query = `DELETE FROM employee_extensions WHERE id = $1 RETURNING *`;
  const result = await db.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  addEmployeeExtension,
  getEmployeeExtensionById,
  getAllEmployeeExtensions,
  updateEmployeeExtension,
  deleteEmployeeExtension
};
