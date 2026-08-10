const DriverRent = require("../models/driverRentModel");

/* ================= CREATE ================= */

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD DRIVER RENT BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const result = await DriverRent.create(req.body);

    return res.status(200).json({
      status: true,
      driver_rent: result.rent,
      driver_rent_lineitems: {
        status: true,
        driver_rent_lineitems: result.lineItems,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= DISTINCT ================= */

exports.getDistinct = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    const company_id = req.query.company_id;

    const result = await DriverRent.getDistinct(offset, limit, company_id);

    return res.json({
      status: true,
      count: result.count,
      driver_rents: result.driver_rents,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= GET BY DRIVER ID ================= */

exports.getByDriverId = async (req, res) => {
  try {
    const { driver_id, company_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const rents = await DriverRent.getByDriverId(driver_id, company_id);

    return res.json({
      status: true,
      count: rents.length,
      driver_rents: rents,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= GET BY ID ================= */

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "id is required",
      });
    }

    const rent = await DriverRent.getById(id);

    if (!rent) {
      return res.status(404).json({
        status: false,
        message: "Driver rent not found",
      });
    }

    return res.json({
      status: true,
      driver_rent: rent,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "rent id is required",
      });
    }

    const result = await DriverRent.update(id, req.body);

    return res.status(200).json({
      status: true,
      driver_rent: result,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "rent id is required",
      });
    }

    await DriverRent.delete(id);

    return res.status(200).json({
      status: true,
      message: "Driver rent deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
