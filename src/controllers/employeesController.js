require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Employee = require("../models/employeeModel");
const EmployeeExtension = require("../models/employeeExtensionsModel");
const Role = require("../models/roleModel");
const pool = require("../db");
const path = require("path");
const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";
const JWT_SECRET = process.env.JWT_SECRET || "NexusTaxiDispatchSystem";

// Helper for password hashing
const hashPassword = async (plainPassword) => {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
};

const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      username,
      email,
      phone,
      fax,
      role,
      subsidiary,
    } = req.query;

    const { employees, total } = await Employee.getAll({
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      username,
      email,
      phone,
      fax,
      role,
      subsidiary,
    });

    res.status(200).json({
      status: true,
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      total,
      total_pages: Math.ceil(total / limit),
      count: employees.length,
      employees,
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const employee = await Employee.getById(id);
    if (!employee) {
      return res
        .status(404)
        .json({ status: false, message: "Employee not found" });
    }
    res.status(200).json({ status: true, statusCode: 200, employee });
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const create = async (req, res) => {
  try {
    const {
      subsidiary_id,
      role_id,
      username,
      password,
      confirmpassword,
      email,
      phone,
      fax,
      web_device_id,
      mobile_device_id,
      extension_number,
      release_note_viewed,
      active,
      alldrivers,
      allbookings,
      allaccounts,
      callreceiver,
      allowtransferbookings,
    } = req.body;
    
    // 🖼️ Image handling
    const imageUrl = req.file ? `${BASE_URL}${req.file.filename}` : null;
    req.body.image = imageUrl;
    console.log(
      "🚀 INCOMING EMPLOYEE ADD BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!username || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Username and password are required" });
    }

    // Check duplicate username
    const existing = await Employee.getByUsername(username.toLowerCase());
    if (existing) {
      return res
        .status(400)
        .json({ status: false, message: "Username already exists" });
    }

    // Hash password
    const hashed = await hashPassword(password);
    const confirmhashed = await hashPassword(confirmpassword);

    // Create employee
    const newEmp = await Employee.create({
      subsidiary_id,
      role_id,
      username: username.toLowerCase(),
      password: hashed,
      confirmpassword: confirmhashed,
      email,
      phone,
      fax,
      image: imageUrl,
      web_device_id,
      mobile_device_id,
      extension_number,
      release_note_viewed,
      active,
      alldrivers,
      allbookings,
      allaccounts,
      callreceiver,
      allowtransferbookings,
    });

    // Fetch role and subsidiary info
    const roleResult = await pool.query(
      "SELECT name FROM roles WHERE id = $1",
      [newEmp.role_id],
    );
    const subResult = await pool.query(
      "SELECT name FROM subsidiaries WHERE id = $1",
      [newEmp.subsidiary_id],
    );

    const employee = {
      ...newEmp,
      role: roleResult.rows[0] ? { name: roleResult.rows[0].name } : null,
      subsidiary: subResult.rows[0] ? { name: subResult.rows[0].name } : null,
    };

    res.status(200).json({
      status: true,
      statusCode: 200,
      employee,
    });
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    // Image handling
    if (req.file) {
      const imageUrl = `${BASE_URL}${req.file.filename}`;
      req.body.image = imageUrl;
    }

    console.log(
      "🚀 INCOMING EMPLOYEE UPDATE BODY:",
      JSON.stringify(req.body, null, 2),
    );

    // Check username uniqueness
    if (data.username) {
      const existing = await Employee.getByUsername(
        data.username.toLowerCase(),
      );
      if (existing && existing.id !== id) {
        return res
          .status(400)
          .json({ status: false, message: "Username already exists" });
      }
      data.username = data.username.toLowerCase();
    }

    // Hash password if provided
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    // Update employee
    const updated = await Employee.update(id, data);
    if (!updated) {
      return res
        .status(404)
        .json({ status: false, message: "Employee not found" });
    }

    // Fetch role and subsidiary info
    const roleResult = await pool.query(
      "SELECT name FROM roles WHERE id = $1",
      [updated.role_id],
    );
    const subResult = await pool.query(
      "SELECT name FROM subsidiaries WHERE id = $1",
      [updated.subsidiary_id],
    );

    const employee = {
      ...updated,
      role: roleResult.rows[0] ? { name: roleResult.rows[0].name } : null,
      subsidiary: subResult.rows[0] ? { name: subResult.rows[0].name } : null,
    };

    res.status(200).json({
      status: true,
      statusCode: 200,
      employee,
    });
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await Employee.remove(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ status: false, message: "Employee not found" });
    }

    // Fetch role and subsidiary info (if they existed before deletion)
    const roleResult = await pool.query(
      "SELECT name FROM roles WHERE id = $1",
      [deleted.role_id],
    );
    const subResult = await pool.query(
      "SELECT name FROM subsidiaries WHERE id = $1",
      [deleted.subsidiary_id],
    );

    const employee = {
      ...deleted,
      role: roleResult.rows[0] ? { name: roleResult.rows[0].name } : null,
      subsidiary: subResult.rows[0] ? { name: subResult.rows[0].name } : null,
    };

    res.status(200).json({
      status: true,
      message: "Employee Deleted Successfully",
    });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// const login = async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     console.log(
//       "🚀 INCOMING EMPLOYEE LOGIN BODY:",
//       JSON.stringify(req.body, null, 2)
//     );
//     if (!username || !password) {
//       return res.status(400).json({
//         status: false,
//         message: "Username and password are required",
//       });
//     }

//     // Find user
//     const employee = await Employee.getByUsername(username.toLowerCase());
//     if (!employee) {
//       return res
//         .status(401)
//         .json({ status: false, message: "Invalid username or password" });
//     }

//     // Compare passwords
//     const match = await bcrypt.compare(password, employee.password);
//     if (!match) {
//       return res
//         .status(401)
//         .json({ status: false, message: "Invalid username or password" });
//     }

//     // Fetch role + subsidiary
//     const roleResult = await pool.query(
//       "SELECT name FROM roles WHERE id = $1",
//       [employee.role_id]
//     );
//     const subResult = await pool.query(
//       "SELECT name FROM subsidiaries WHERE id = $1",
//       [employee.subsidiary_id]
//     );

//     const fullEmployee = {
//       ...employee,
//       role: roleResult.rows[0] ? { name: roleResult.rows[0].name } : null,
//       subsidiary: subResult.rows[0] ? { name: subResult.rows[0].name } : null,
//     };

//     // Generate token
//     const token = jwt.sign(
//       {
//         id: employee.id,
//         username: employee.username,
//         role_id: employee.role_id,
//       },
//       JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.status(200).json({
//       status: true,
//       message: "Login successful",
//       token,
//       employee: fullEmployee,
//     });
//   } catch (err) {
//     console.error("Error logging in:", err);
//     res.status(500).json({ status: false, message: "Server error" });
//   }
// };

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(
      "🚀 INCOMING EMPLOYEE LOGIN BODY:",
      JSON.stringify(req.body, null, 2),
    );

    if (!username || !password) {
      return res.status(400).json({
        status: false,
        message: "Username and password are required",
      });
    }

    // Find user
    const employee = await Employee.getByUsername(username.toLowerCase());
    if (!employee) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid username or password" });
    }

    if(employee.active == false || employee.active == "false"){
      return res
        .status(400)
        .json({ status: false, message: "You Are Inactive" });
    }
    // Compare passwords
    const match = await bcrypt.compare(password, employee.password);
    if (!match) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid username or password" });
    }

    // Fetch role + subsidiary
    const roleResult = await pool.query(
      "SELECT name FROM roles WHERE id = $1",
      [employee.role_id],
    );

    const subResult = await pool.query(
      "SELECT name FROM subsidiaries WHERE id = $1",
      [employee.subsidiary_id],
    );

    // 🔥 Fetch extensions for this employee
    const extQuery = `
      SELECT ee.*, 
        json_build_object(
          'id', e.id,
          'username', e.username
        ) AS employee
      FROM employee_extensions ee
      LEFT JOIN employees e ON e.id = ee.employee_id
      WHERE ee.employee_id = $1
    `;
    const extResult = await pool.query(extQuery, [employee.id]);

    const fullEmployee = {
      ...employee,
      role: roleResult.rows[0] ? { name: roleResult.rows[0].name } : null,
      subsidiary: subResult.rows[0] ? { name: subResult.rows[0].name } : null,
      employee_extensions: extResult.rows, // ← Added extensions here
    };

    // Generate token
    const token = jwt.sign(
      {
        id: employee.id,
        username: employee.username,
        role_id: employee.role_id,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      status: true,
      message: "Login Successful",
      token,
      employee: fullEmployee,
    });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const logout = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
    return res.status(400).json({ message: "Employee ID is required" });
  }


    // Find user
    const employee = await Employee.getById(id);
    if (!employee) {
      return res
        .status(404)
        .json({ status: false, message: "Employee Not Found" });
    }


    res.status(200).json({
      status: true,
      message: "Logout Successful",
    });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

module.exports = { getAll, getById, create, update, remove, login, logout };
