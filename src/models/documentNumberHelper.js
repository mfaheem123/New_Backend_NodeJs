const pool = require("../db");

// WITH SUBSIDIARY
// exports.generateInvoiceNumber = async (subsidiary_id) => {
//   const res = await pool.query(
//     `
//     SELECT *
//     FROM document_numbers
//     WHERE subsidiary_id = $1
//       AND document_table = 'account_invoice'
//       AND auto_increment = true
//     FOR UPDATE
//   `,
//     [subsidiary_id],
//   );

//   if (!res.rows.length) {
//     throw new Error("Invoice document number config not found");
//   }

//   const doc = res.rows[0];
//   const nextNumber = doc.end_number + doc.increment_value;
//   const invoiceNumber = `${doc.prefix}${nextNumber}`;

//   await pool.query(
//     `
//     UPDATE document_numbers
//     SET end_number = $1, updated_at = now()
//     WHERE id = $2
//   `,
//     [nextNumber, doc.id],
//   );

//   return invoiceNumber;
// };

// WITHOUT SUBSIDIARY
exports.generateInvoiceNumber = async () => {
  const res = await pool.query(
    `
    SELECT *
    FROM document_numbers
    WHERE document_table = 'account_invoice'
      AND auto_increment = true
    ORDER BY id ASC
    LIMIT 1
    FOR UPDATE
    `
  );

  if (!res.rows.length) {
    throw new Error("Invoice document number config not found");
  }

  const doc = res.rows[0];
  const nextNumber = doc.end_number + doc.increment_value;
  const invoiceNumber = `${doc.prefix}${nextNumber}`;

  await pool.query(
    `
    UPDATE document_numbers
    SET end_number = $1, updated_at = now()
    WHERE id = $2
    `,
    [nextNumber, doc.id]
  );

  return invoiceNumber;
};