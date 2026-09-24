const db = require('../db'); // pg pool connection

const DriverAttribute = {
    // Get All Attributes
    getAll: async (company_id) => {
        let query;
        let params;

        if (company_id) {
            query = 'SELECT id, attribute_name, short_name FROM driver_attributes WHERE company_id = $1 ORDER BY id ASC;';
            params = [company_id];
        } else {
            query = 'SELECT id, attribute_name, short_name FROM driver_attributes ORDER BY id ASC;';
            params = [];
        }

        const { rows } = await db.query(query, params);
        return rows;
    },

    // Get Attribute By ID
    getById: async (id) => {
        const query = 'SELECT id, attribute_name, short_name FROM driver_attributes WHERE id = $1;';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    },

    // Add Attribute
    create: async (attribute_name, short_name, company_id) => {
        const query = `
            INSERT INTO driver_attributes (attribute_name, short_name, company_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id, attribute_name, short_name;
        `;
        const { rows } = await db.query(query, [attribute_name, short_name, company_id]);
        return rows[0];
    },

    // Update Attribute
    update: async (id, attribute_name, short_name) => {
        const query = `
            UPDATE driver_attributes
            SET attribute_name = $1, short_name = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, attribute_name, short_name;
        `;
        const { rows } = await db.query(query, [attribute_name, short_name, id]);
        return rows[0];
    },

    // Delete Attribute
    delete: async (id) => {
        const query = 'DELETE FROM driver_attributes WHERE id = $1 RETURNING id;';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }
};

module.exports = DriverAttribute;