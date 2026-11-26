const db = require("../db");

const SearchModel = {
  async searchRecords({ company_id, type, mobile, email, query }) {
    const normalizedType = String(type || "").toLowerCase().trim();

    let tableName;
    switch (normalizedType) {
      case "customer":
        tableName = "customers";
        break;
      case "account":
        tableName = "accounts";
        break;
      case "driver":
        tableName = "drivers";
        break;
      default:
        throw new Error(
          "Invalid type. Allowed values are: customer, account, driver"
        );
    }

    let sql = `
      SELECT id, name, mobile, email
      FROM ${tableName}
      WHERE company_id = $1
    `;
    const params = [Number(company_id)];
    let paramIndex = 2;

    // Mobile filter (agar mobile diya gaya ho)
    if (mobile && String(mobile).trim() !== "") {
      sql += ` AND mobile ILIKE $${paramIndex}`;
      params.push(`%${String(mobile).trim()}%`);
      paramIndex++;
    }

    // Email filter (agar email diya gaya ho)
    if (email && String(email).trim() !== "") {
      sql += ` AND email ILIKE $${paramIndex}`;
      params.push(`%${String(email).trim()}%`);
      paramIndex++;
    }

    // Optional combined search (`q` ya `search`) agar mobile aur email dono alag se na diye hon
    if (query && String(query).trim() !== "") {
      const searchTerm = `%${String(query).trim()}%`;
      sql += ` AND (mobile ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
      params.push(searchTerm);
      paramIndex++;
    }

    sql += ` ORDER BY id DESC`;

    const { rows } = await db.query(sql, params);
    return rows;
  },
};

module.exports = SearchModel;