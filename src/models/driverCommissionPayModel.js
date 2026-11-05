const pool = require('../db');

class DriverCommissionModel {
    // Get all ledgers with filters, offset, and limit
    static async getAll(driver_id, invoice_type, limit, offset, company_id) {
        let query = `SELECT * FROM driver_commission_ledgers WHERE 1=1`;
        let queryParams = [];
        let paramIndex = 1;

        if (driver_id) {
            query += ` AND driver_id = $${paramIndex++}`;
            queryParams.push(driver_id);
        }

        if (invoice_type) {
            query += ` AND invoice_type = $${paramIndex++}`;
            queryParams.push(invoice_type);
        }

        // Count query for total matching rows
        const countQuery = `SELECT COUNT(*) FROM driver_commission_ledgers WHERE 1=1` + 
            (driver_id ? ` AND driver_id = $1` : '') + 
            (invoice_type ? ` AND invoice_type = $${driver_id ? 2 : 1}` : '') + 
            (company_id ? ` AND company_id = $${driver_id && invoice_type ? 3 : driver_id || invoice_type ? 2 : 1}` : '');
        
        const countParams = [];
        if (driver_id) countParams.push(driver_id);
        if (invoice_type) countParams.push(invoice_type);
        if (company_id) countParams.push(company_id);

        const countResult = await pool.query(countQuery, countParams);
        const count = parseInt(countResult.rows[0].count);

        query += ` ORDER BY id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limit, offset);

        const result = await pool.query(query, queryParams);
        return { count, rows: result.rows };
    }

    // Get ledger by ID
    static async getById(id) {
        const query = `SELECT * FROM driver_commission_ledgers WHERE id = $1`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Create new entry
    static async create(data) {
        const { driver_id, date, amount, current_balance, type, invoice_type, description, company_id } = data;
        const query = `
            INSERT INTO driver_commission_ledgers 
            (driver_id, date, amount, current_balance, type, invoice_type, description, company_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;
        const values = [driver_id, date || new Date(), amount, current_balance, type, invoice_type || 'commission', description || '', company_id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Update entry
    static async update(id, data) {
    const allowedFields = [
        'driver_id', 
        'date', 
        'amount', 
        'current_balance', 
        'type', 
        'invoice_type', 
        'description', 
        'company_id'
    ];
    
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    // Sirf wahi fields query mein shamil hongi jo request body mein bheji gayi hain
    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            setClauses.push(`${field} = $${paramIndex++}`);
            values.push(data[field]);
        }
    }

    // Agar koi bhi field update ke liye nahi aayi
    if (setClauses.length === 0) {
        throw new Error("No fields provided for update");
    }

    // updated_at ko hamesha current timestamp par set karein
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    // ID ko last parameter ke taur par add karein
    values.push(id);

    const query = `
        UPDATE driver_commission_ledgers 
        SET ${setClauses.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
}

    // Delete entry
    static async delete(id) {
        const query = `DELETE FROM driver_commission_ledgers WHERE id = $1 RETURNING *;`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = DriverCommissionModel;