const customerInvoiceModel = require("../models/customerInvoiceModel");
const pool = require("../db");

// UNIQUE CUSTOMER INVOICE NUMBER GENERATOR
async function genRef() {
  let ref;
  let exists = true;

  while (exists) {
    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    ref = "CINV" + digits;

    const checkQuery = `SELECT invoice_number FROM customer_invoices WHERE invoice_number = $1 LIMIT 1`;
    const result = await pool.query(checkQuery, [ref]);

    if (result.rows.length === 0) exists = false;
  }
  return ref;
}

exports.customerInvoiceNumber = async (req, res) => {
  try {
    const invoice = await genRef();

    res.status(200).json({
      status: true,
      invoice_number: invoice,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const invoice = await customerInvoiceModel.createCustomerInvoice(req.body);

    res.status(200).json({
      status: true,
      customer_invoice: invoice,
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
    const { offset = 0, limit = 100, invoice_type } = req.query;

    const invoices = await customerInvoiceModel.getAllCustomerInvoices(
      Number(offset),
      Number(limit),
      invoice_type,
    );

    res.json({
      status: true,
      count: invoices.length,
      customer_invoices: invoices,
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
    const invoice = await customerInvoiceModel.getById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        status: false,
        message: "Invoice not found",
      });
    }

    res.json({
      status: true,
      customer_invoice: invoice,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.pay = async (req, res) => {
  try {
    const invoice = await customerInvoiceModel.payCustomerInvoice(
      req.params.id,
    );

    res.json({
      status: true,
      customer_invoice: invoice,
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
    const invoice = await customerInvoiceModel.update(req.params.id, req.body);

    res.json({
      status: true,
      customer_invoice: invoice,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const invoice = await customerInvoiceModel.deleteCustomerInvoice(
      req.params.id,
    );

    res.json({
      status: true,
      customer_invoice: invoice,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
