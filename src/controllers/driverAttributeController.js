const DriverAttribute = require("../models/driverAttributeModel");

// GET ALL
exports.getAllAttributes = async (req, res) => {
  try {
    const company_id = req.query.company_id;
    const attributes = await DriverAttribute.getAll(company_id);
    return res.status(200).json({
      status: true,
      count: attributes.length,
      driver_attribute: attributes,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// GET BY ID
exports.getAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await DriverAttribute.getById(id);

    if (!attribute) {
      return res
        .status(404)
        .json({ status: false, message: "Attribute not found" });
    }

    return res.status(200).json({
      status: true,
      driver_attribute: attribute,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// ADD
exports.addAttribute = async (req, res) => {
  try {
    const { attribute_name, short_name, company_id } = req.body;

    if (!attribute_name || !short_name || !company_id) {
      return res.status(400).json({
        status: false,
        message: "attribute_name, short_name, and company_id are required",
      });
    }

    const newAttribute = await DriverAttribute.create(
      attribute_name,
      short_name,
      company_id,
    );

    return res.status(200).json({
      status: true,
      driver_attribute: newAttribute,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// UPDATE
exports.updateAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { attribute_name, short_name } = req.body;

    const updated = await DriverAttribute.update(
      id,
      attribute_name,
      short_name,
    );

    if (!updated) {
      return res
        .status(404)
        .json({ status: false, message: "Attribute not found" });
    }

    return res.status(200).json({
      status: true,
      driver_attribute: updated,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// DELETE
exports.deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DriverAttribute.delete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ status: false, message: "Attribute not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Driver attribute deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
