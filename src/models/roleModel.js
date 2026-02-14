// src/models/roleModel.js
const pool = require("../db");

// Get All Role
const getAll = async () => {
  const { rows } = await pool.query("SELECT * FROM roles ORDER BY id");
  return rows;
};

// Get Role By ID
const getById = async (id) => {
  const { rows } = await pool.query("SELECT * FROM roles WHERE id = $1", [id]);
  return rows[0] || null;
};

// Add Role
const create = async (data) => {
  const { name } = data;
  const q = "INSERT INTO roles (name) VALUES ($1) RETURNING *";
  const { rows } = await pool.query(q, [name]);
  return rows[0];
};

//Update Role By ID
const update = async (id, data) => {
  const { name } = data;
  const q = `UPDATE roles SET name = $1, updated_at = now() WHERE id = $2 RETURNING *`;
  const { rows } = await pool.query(q, [name, id]);
  return rows[0] || null;
};

// Delete Role By ID
const remove = async (id) => {
  const q = `DELETE FROM roles WHERE id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
};

module.exports = { getAll, getById, create, update, remove };
