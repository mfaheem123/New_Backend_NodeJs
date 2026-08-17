const db = require('../db');

class CompanyClientModel {
  /**
   * Source ya Destination phone number se active company lookup karein
   * @param {string} phoneNumber 
   */
  static async findCompanyByPhone(phoneNumber) {
    if (!phoneNumber) return null;

    // Number me se non-digit characters remove karna if required
    const cleanNumber = phoneNumber.trim();

    const query = `
      SELECT id, company_name 
      FROM company_clients 
      WHERE (mobile = $1 OR mobile = $2) AND status = 'active'
      LIMIT 1;
    `;

    // Normal search & leading zero sanitize format check
    const formattedWithZero = cleanNumber.startsWith('0') ? cleanNumber : '0' + cleanNumber;
    
    const result = await db.query(query, [cleanNumber, formattedWithZero]);
    return result.rows[0] || null;
  }
}

module.exports = CompanyClientModel;