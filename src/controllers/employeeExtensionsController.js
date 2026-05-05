const EmployeeExtModel = require("../models/employeeExtensionsModel");

module.exports = {
  add: async (req, res) => {
    try {
      const { employee_id, extension_number, permanent_flag, company_id } =
        req.body;

      console.log(
        "🚀 INCOMING EMPLOYEE EXTENSION ADD BODY:",
        JSON.stringify(req.body, null, 2),
      );

      // 🔍 Check if extension already exists
      const existing =
        await EmployeeExtModel.getEmployeeExtensionById(employee_id);

      let result;

      if (existing.length > 0) {
        // ✅ UPDATE EXISTING
        result = await EmployeeExtModel.updateEmployeeExtension(
          existing[0].id,
          {
            extension_number,
            permanent_flag,
          },
        );
      } else {
        // ✅ CREATE NEW
        result = await EmployeeExtModel.addEmployeeExtension(
          employee_id,
          extension_number,
          permanent_flag,
          company_id,
        );
      }

      // 📦 Return latest data
      const data = await EmployeeExtModel.getEmployeeExtensionById(employee_id);

      res.json({
        status: true,
        employee_extensions: data,
      });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },

  // ➤ Get Extension by Employee ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const data = await EmployeeExtModel.getEmployeeExtensionById(id);

      res.json({ status: true, employee_extensions: data });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },

  // ➤ Get All Extensions
  get: async (req, res) => {
    try {
      const { company_id } = req.query;
      const data = await EmployeeExtModel.getAllEmployeeExtensions(company_id);
      res.json({ status: true, employee_extensions: data });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },

  // ➤ Update Extension
  update: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(
        "🚀 INCOMING EMPLOYEE EXTENSION UPDATE BODY:",
        JSON.stringify(req.body, null, 2),
      );

      const updated = await EmployeeExtModel.updateEmployeeExtension(
        id,
        req.body, // pass req.body directly
      );

      if (!updated)
        return res
          .status(400)
          .json({ status: false, message: "No fields provided to update" });

      res.json({ status: true, employee_extension: updated });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },

  // ➤ Delete Extension
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const removed = await EmployeeExtModel.deleteEmployeeExtension(id);

      res.json({ status: true, deleted: removed });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },
  upsert: async (req, res) => {
    try {
      const { employee_id, extension_number, permanent_flag } = req.body;

      // Check if extension exists for this employee
      const existing =
        await EmployeeExtModel.getEmployeeExtensionById(employee_id);

      let result;
      if (existing.length > 0) {
        // Update existing extension
        result = await EmployeeExtModel.updateEmployeeExtension(
          existing[0].id,
          extension_number,
          permanent_flag,
        );
      } else {
        // Add new extension
        result = await EmployeeExtModel.addEmployeeExtension(
          employee_id,
          extension_number,
          permanent_flag,
        );
      }

      // Return latest state
      const data = await EmployeeExtModel.getEmployeeExtensionById(employee_id);

      res.json({
        status: true,
        employee_extensions: data,
      });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },
};
