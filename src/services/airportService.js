const pool = require("../db");

class AirportService {

    // GET ALL AIRPORTS
    static async getAllAirports() {
        const query = `
            SELECT l.*,
                   to_json(lt) AS location_type
            FROM locations l
            LEFT JOIN location_types lt
              ON lt.id = l.location_type_id
            WHERE l.location_type_id = 2
            ORDER BY l.id ASC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    //GET BY ID
     static async getAirportById(id) {
        const result = await pool.query("SELECT * FROM locations WHERE id = $1", [id]);
        return result.rows[0];
    }

    // UPDATE / EDIT
    static async updateAirport(id, data) {

        // Incoming editable fields
        const editableFields = [
            "name",
            "address",
            "postcode",
            "pickup_charges",
            "dropoff_charges",
            "shortcut",
            "background_color",
            "foreground_color",
            "extra_charges"
        ];

        let setQuery = [];
        let values = [];
        let i = 1;

        for (const key in data) {
            if (editableFields.includes(key)) {
                setQuery.push(`${key} = $${i}`);
                values.push(data[key]);
                i++;
            }
        }

        if (setQuery.length === 0) {
            throw new Error("No valid fields sent to update");
        }

        values.push(id);

        const query = `
            UPDATE locations
            SET ${setQuery.join(", ")}
            WHERE id = $${i}
            RETURNING *
        `;

        const updated = await pool.query(query, values);
        return updated.rows[0];
    }

    // DELETE AIRPORT
    static async deleteAirport(id) {
        const query = `DELETE FROM locations WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async clearCharges(id) {

    const query = `
        UPDATE locations
        SET pickup_charges = 0,
            dropoff_charges = 0
        WHERE id = $1
        RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
}

}


module.exports = AirportService;
