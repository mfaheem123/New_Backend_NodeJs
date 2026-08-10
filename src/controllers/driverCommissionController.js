const DriverCommission = require("../models/driverCommissionModel");

/* ================= CREATE ================= */

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD DRIVER COMMISSION BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const result = await DriverCommission.create(req.body);

    return res.status(200).json({
      status: true,
      driver_commission: result.commission,
      driver_commission_lineitems: {
        status: true,
        driver_commission_lineitems: result.lineItems,
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

    const result = await DriverCommission.getDistinct(
      offset,
      limit,
      company_id,
    );

    return res.json({
      status: true,
      count: result.count,
      driver_commissions: result.driver_commissions,
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

    const commissions = await DriverCommission.getByDriverId(
      driver_id,
      company_id,
    );

    return res.json({
      status: true,
      count: commissions.length,
      driver_commissions: commissions,
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

    const commission = await DriverCommission.getById(id);

    if (!commission) {
      return res.status(404).json({
        status: false,
        message: "Driver commission not found",
      });
    }

    return res.json({
      status: true,
      driver_commission: commission,
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
        message: "Commission id is required",
      });
    }
    console.log(
      "🚀 INCOMING UPDATE DRIVER COMMISSION BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const result = await DriverCommission.update(id, req.body);

    return res.status(200).json({
      status: true,
      driver_commission: result,
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
        message: "Commission id is required",
      });
    }

    await DriverCommission.delete(id);

    return res.status(200).json({
      status: true,
      message: "Driver commission deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
