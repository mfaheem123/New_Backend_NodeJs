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
    const { offset = 0, limit = 100, invoice_type } = req.query;

    const result = await InvoiceModel.getAll({
      offset: Number(offset),
      limit: Number(limit),
      invoice_type,
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
