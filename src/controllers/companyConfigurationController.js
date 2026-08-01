const companyConfigurationModel = require("../models/companyConfigurationModel");

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD OR UPDATE COMPANY CONFIGURATION BODY:",
      JSON.stringify(req.body, null, 2),
    );

    const result = await companyConfigurationModel.createOrUpdate(req.body);

    return res.status(200).json({
      status: true,
      message:
        result.action === "created"
          ? "Company Configuration Created Successfully."
          : result.action === "updated"
            ? "Company Configuration Updated Successfully."
            : "No changes detected.",
      company_configuration: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { company_id } = req.query;
    const data = await companyConfigurationModel.getAll(company_id);

    res.status(200).json({
      status: true,
      company_configurations: data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await companyConfigurationModel.getById(
      req.params.subsidiary_id,
    );

    res.status(200).json({
      status: true,
      company_configuration: data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await companyConfigurationModel.update(
      req.params.subsidiary_id,
      req.body,
    );

    res.status(200).json({
      status: true,
      message: "Configuration updated successfully.",
      company_configuration: result,
    });
  } catch (error) {
    if (error.message === "Configuration not found.") {
      return res.status(404).json({
        status: false,
        message: error.message,
      });
    }

    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    await companyConfigurationModel.delete(req.params.subsidiary_id);

    res.status(200).json({
      status: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
