const pool = require("../db");
const InvoiceModel = require("../models/accountInvoiceModel");
const { generateInvoiceNumber } = require("../models/documentNumberHelper");

exports.create = async (req, res) => {
  const client = await pool.connect();

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
      amount
    } = req.body;

    await client.query("BEGIN");

    // 🔐 generate invoice number
    const invoice_number = await generateInvoiceNumber(
      client,
      subsidiary_id
    );

    // 📄 create invoice
    const invoice = await InvoiceModel.create(client, {
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
      amount
    });

    await client.query("COMMIT");

    res.json({
      status: true,
      account_invoice: invoice
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({
      status: false,
      message: err.message
    });
  } finally {
    client.release();
  }
};
