const pool = require("../db");
const InvoiceModel = require("../models/accountInvoiceModel");
const { generateInvoiceNumber } = require("../models/documentNumberHelper");

exports.create = async (req, res) => {

  try {
    const {
      subsidiary_id,
      account_id,
      invoice_date,
      invoice_due_date,
      from_date,
      to_date,
      invoice_type,
      department_id,
      order_number,
      amount,
    } = req.body;

    await pool.query("BEGIN");

    // 🔐 generate invoice number
    const invoice_number = await generateInvoiceNumber(subsidiary_id);

    // 📄 create invoice
    const invoice = await InvoiceModel.create({
      subsidiary_id,
      account_id,
      invoice_number,
      invoice_date,
      invoice_due_date,
      from_date,
      to_date,
      invoice_type,
      department_id,
      order_number,
      amount,
    });

    await pool.query("COMMIT");

    res.json({
      status: true,
      account_invoice: invoice,
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({
      status: false,
      message: err.message,
    });
  } 
};
