// src/controllers/rolesController.js
const Role = require("../models/roleModel");

const getAll = async (req, res) => {
  try {
    const roles = await Role.getAll();
    res.json({ status: true, statusCode: 200, count: roles.length, roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = await Role.getById(id);
    if (!role)
      return res.status(404).json({ status: false, message: "Role not found" });
    res.json({ status: true, statusCode: 200, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ status: false, message: "Role name is required" });
    const newRole = await Role.create({ name });
    res.status(200).json({ status: true, statusCode: 200, role: newRole });
  } catch (err) {
    if (err.code === "23505") {
      // unique violation
      return res
        .status(400)
        .json({ status: false, message: "Role name already exists" });
    }
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ status: false, message: "Role name is required" });
    const updated = await Role.update(id, { name });
    if (!updated)
      return res.status(404).json({ status: false, message: "Role not found" });
    res.json({ status: true, statusCode: 200, role: updated });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ status: false, message: "Role name already exists" });
    }
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await Role.remove(id);
    if (!deleted)
      return res.status(404).json({ status: false, message: "Role not found" });
    res.json({ status: true, statusCode: 200, role: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

module.exports = { getAll, getById, create, update, remove };
