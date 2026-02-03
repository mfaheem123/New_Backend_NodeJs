const pool = require("../db");

exports.generateInvoiceNumber = async (client, subsidiary_id) => {
  const res = await client.query(`
    SELECT *
    FROM document_numbers
    WHERE subsidiary_id = $1
      AND document_table = 'account_invoice'
      AND auto_increment = true
    FOR UPDATE
  `, [subsidiary_id]);

  if (!res.rows.length) {
    throw new Error("Invoice document number config not found");
  }

  const doc = res.rows[0];
  const nextNumber = doc.end_number + doc.increment_value;
  const invoiceNumber = `${doc.prefix}${nextNumber}`;

  await client.query(`
    UPDATE document_numbers
    SET end_number = $1, updated_at = now()
    WHERE id = $2
  `, [nextNumber, doc.id]);

  return invoiceNumber;
};
