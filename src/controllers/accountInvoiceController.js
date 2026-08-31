const InvoiceModel = require("../models/accountInvoiceModel");

// ---------------------------------------------------------
// CREATE ACCOUNT INVOICE
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET ALL ACCOUNT INVOICES
// ---------------------------------------------------------
exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      from_date,
      to_date,
      status,
      invoice_number,
      account_name,
      department_name,
      order_number,
      amount,
      subsidiary_name,
      invoice_date,
      invoice_due_date,
      company_id,
    } = req.query;

    const result = await InvoiceModel.getAll({
      page: Number(page),
      limit: Number(limit),
      from_date,
      to_date,
      status,
      invoice_number,
      account_name,
      department_name,
      order_number,
      amount,
      subsidiary_name,
      invoice_date,
      invoice_due_date,
      company_id,
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

// ---------------------------------------------------------
// GET ACCOUNT INVOICES BY ID
// ---------------------------------------------------------
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await InvoiceModel.getById(id);

    if (!result) {
      return res.status(404).json({
        status: false,
        message: "Invoice not found",
      });
    }

    res.json({
      account_invoice: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// ---------------------------------------------------------
// UPDATE ACCOUNT INVOICE BY ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// DELETE ACCOUNT INVOICE BY ID
// ---------------------------------------------------------
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
