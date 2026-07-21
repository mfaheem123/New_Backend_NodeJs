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

exports.createCustomerInvoice = async (req, res) => {
  try {
    console.log(
      "🚀 CREATE CUSTOMER INVOICE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const payload = {
      ...req.body,
      customer_invoice_lineitems:
        typeof req.body.customer_invoice_lineitems === "string"
          ? JSON.parse(req.body.customer_invoice_lineitems.trim())
          : req.body.customer_invoice_lineitems,
    };

    console.log("CREATE CUSTOMER INVOICE PAYLOAD: ", payload);

    const result = await customerInvoiceModel.createCustomerInvoice(payload);

    res.status(200).json({
      status: true,
      customer_invoice: result.customer_invoice,
      customer_invoice_lineitems: result.customer_invoice_lineitems,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getAllCustomerInvoice = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 100,
      invoice_type,

      invoice_number,
      customer,
      invoice_date,
      invoice_due_date,
      status,
      amount,
      company_id,
    } = req.query;

    const invoices = await customerInvoiceModel.getAllCustomerInvoices(
      Number(offset),
      Number(limit),
      {
        invoice_type,
        invoice_number,
        customer,
        invoice_date,
        invoice_due_date,
        status,
        amount,
        company_id,
      },
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

exports.getByIdCustomerInvoice = async (req, res) => {
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

exports.payCustomerInvoice = async (req, res) => {
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

exports.updateCustomerInvoice = async (req, res) => {
  try {
    console.log(
      "🚀 UPDATE CUSTOMER INVOICE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const payload = {
      ...req.body,
      customer_invoice_lineitems:
        typeof req.body.customer_invoice_lineitems === "string"
          ? JSON.parse(req.body.customer_invoice_lineitems.trim())
          : req.body.customer_invoice_lineitems,
    };
    console.log("UPDATE CUSTOMER INVOICE PAYLOAD: ", payload);

    const result = await customerInvoiceModel.update(
      req.params.id,

      payload,
    );

    res.json({
      status: true,
      customer_invoice: result.customer_invoice,
      customer_invoice_lineitems: result.customer_invoice_lineitems,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.removeCustomerInvoice = async (req, res) => {
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
