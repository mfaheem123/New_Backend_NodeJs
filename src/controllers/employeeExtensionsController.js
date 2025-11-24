const EmployeeExtModel = require("../models/employeeExtensionsModel");

module.exports = {
  add: async (req, res) => {
    try {
      const { employee_id, extension_number, permanent_flag } = req.body;
      console.log(
        "🚀 INCOMING EMPLOYEE EXTENSION ADD BODY:",
        JSON.stringify(req.body, null, 2)
      );
      const extension = await EmployeeExtModel.addEmployeeExtension(
        employee_id,
        extension_number,
        permanent_flag
      );

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
      const data = await EmployeeExtModel.getAllEmployeeExtensions();
      res.json({ status: true, employee_extensions: data });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  },

  // ➤ Update Extension
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { extension_number, permanent_flag } = req.body;
      console.log(
        "🚀 INCOMING EMPLOYEE EXTENSION UPDATE BODY:",
        JSON.stringify(req.body, null, 2)
      );

      const updated = await EmployeeExtModel.updateEmployeeExtension(
        id,
        extension_number,
        permanent_flag
      );

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
};
