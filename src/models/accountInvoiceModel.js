exports.create = async (client, data) => {
  const {
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
  } = data;

  const res = await client.query(`
    INSERT INTO account_invoices (
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
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [
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
  ]);

  return res.rows[0];
};
