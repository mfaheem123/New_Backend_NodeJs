const pool = require("../db");

const create = async (subsidiary_id, data) => {
  const q = `
    INSERT INTO subsidiary_bank_details
      (subsidiary_id, bank, account_title, account_number, iban, sort_code, vat_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [
    subsidiary_id,
    data.bank,
    data.account_title,
    data.account_number,
    data.iban,
    data.sort_code,
    data.vat_number,
  ];
  const { rows } = await pool.query(q, values);
  return rows[0];
};

module.exports = { create };
