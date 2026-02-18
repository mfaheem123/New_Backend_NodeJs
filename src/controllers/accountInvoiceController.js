const InvoiceModel = require("../models/accountInvoiceModel");

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD ACCOUNT INVOICE BODY:",
      JSON.stringify(req.body, null, 2),
    );

    const result = await InvoiceModel.create(req.body);

    res.json({
      status: true,
      ...result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      search,
      from_date,
      to_date,
      status,
      invoice_number,
    } = req.query;

    const result = await InvoiceModel.getAll({
      offset: Number(offset),
      limit: Number(limit),
      search,
      from_date,
      to_date,
      status,
      invoice_number,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};


exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await InvoiceModel.update(id, req.body);
    console.log(
      "🚀 INCOMING UPDATE ACCOUNT INVOICE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    res.json({
      status: true,
      message: "Account Invoice Updated Successfully",
      ...result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await InvoiceModel.delete(id);

    res.json({
      status: true,
      message: "Account Invoice Deleted Successfully",
      ...result,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Account invoice not found",
      });
    }

    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
