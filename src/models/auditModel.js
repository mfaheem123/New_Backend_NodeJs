const pool = require('../db'); // Aapka PostgreSQL connection pool

class AuditModel {
    static async getAuditsByBookingId(bookingId) {
        const query = `
            SELECT 
                a.id, 
                a.type, 
                a.date, 
                a.time, 
                a.operation, 
                a.previous, 
                a.next, 
                a.employee_id, 
                a.booking_id, 
                a.driver_id,
                json_build_object('username', e.username) AS employee,
                CASE 
                    WHEN d.id IS NOT NULL THEN json_build_object(
                        'username', d.username, 
                        'first_name', d.first_name, 
                        'last_name', d.last_name
                    )
                    ELSE NULL 
                END AS driver
            FROM audits a
            LEFT JOIN employees e ON a.employee_id = e.id
            LEFT JOIN drivers d ON a.driver_id = d.id
            WHERE a.booking_id = $1
            ORDER BY a.date DESC, a.time DESC;
        `;
        const { rows } = await pool.query(query, [bookingId]);
        return rows;
    }

    static async createAuditLog({ type, operation, previous, next, employee_id, booking_id, driver_id, company_id }) {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    const query = `
        INSERT INTO audits (type, date, time, operation, previous, next, employee_id, booking_id, driver_id, company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    await pool.query(query, [
        type || 'booking',
        currentDate,
        currentTime,
        operation,
        JSON.stringify(previous || []),
        JSON.stringify(next || []),
        employee_id || null,
        booking_id,
        driver_id || null,
        company_id || null
    ]);
}
}

module.exports = AuditModel;