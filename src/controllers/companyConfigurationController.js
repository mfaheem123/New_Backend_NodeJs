const companyConfigurationModel = require("../models/companyConfigurationModel");

exports.create = async (req, res) => {
  try {
    const result = await companyConfigurationModel.create(req.body);

    res.status(200).json({
      status: true,
      message: "Company configuration created successfully",
      company_configuration: result,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await companyConfigurationModel.getAll();

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
    const data = await companyConfigurationModel.getById(req.params.id);

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
    const data = await companyConfigurationModel.update(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      status: true,
      message: "Updated successfully",
      company_configuration: data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    await companyConfigurationModel.delete(req.params.id);

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
