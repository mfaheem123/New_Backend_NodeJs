const DriverCommission = require("../models/driverCommissionModel");



// ---------------------------------------------------------
  // CREATE DRIVER COMMISSION
  // ---------------------------------------------------------
exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD DRIVER COMMISSION BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const result = await DriverCommission.create(req.body);

    return res.status(200).json({
      status: true,
      driver_commission: result.commission,
      driver_commission_lineitems: {
        status: true,
        driver_commission_lineitems: result.lineItems,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};



// ---------------------------------------------------------
  // GET DISTINCT DRIVER COMMISSIONS
  // ---------------------------------------------------------
exports.getDistinct = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    const company_id = req.query.company_id;

    const result = await DriverCommission.getDistinct(
      offset,
      limit,
      company_id,
    );

    return res.json({
      status: true,
      count: result.count,
      driver_commissions: result.driver_commissions,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};



// ---------------------------------------------------------
  // GET DRIVER COMMISSION BY DRIVER ID
  // ---------------------------------------------------------
exports.getByDriverId = async (req, res) => {
  try {
    const { driver_id, company_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const commissions = await DriverCommission.getByDriverId(
      driver_id,
      company_id,
    );

    return res.json({
      status: true,
      count: commissions.length,
      driver_commissions: commissions,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= GET BY ID ================= */

// ---------------------------------------------------------
  // GET DRIVER COMMISSION BY ID
  // ---------------------------------------------------------
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "id is required",
      });
    }

    const commission = await DriverCommission.getById(id);

    if (!commission) {
      return res.status(404).json({
        status: false,
        message: "Driver commission not found",
      });
    }

    return res.json({
      status: true,
      driver_commission: commission,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// ---------------------------------------------------------
  // UPDATE DRIVER COMMISSION BY ID
  // ---------------------------------------------------------
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Commission id is required",
      });
    }
    console.log(
      "🚀 INCOMING UPDATE DRIVER COMMISSION BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const result = await DriverCommission.update(id, req.body);

    return res.status(200).json({
      status: true,
      driver_commission: result,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// ---------------------------------------------------------
  // DELETE DRIVER COMMISSION BY ID
  // ---------------------------------------------------------
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Commission id is required",
      });
    }

    await DriverCommission.delete(id);

    return res.status(200).json({
      status: true,
      message: "Driver commission deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};


// ---------------------------------------------------------
  // GET BULK DRIVER COMMISSION PREVIEW
  // ---------------------------------------------------------
exports.getBulkPreview = async (req, res) => {
  try {
    const { company_id, from_date, to_date } = req.query;

    if (!company_id || !from_date || !to_date) {
      return res.status(400).json({
        status: false,
        message: "company_id, from_date, and to_date are required",
      });
    }

    const reportData = await DriverCommission.getBulkPreview(
      company_id,
      from_date,
      to_date,
    );

    const formattedData = reportData.map((row) => {
      const cashJobsTotal = Number(row.cash_jobs_total);
      const accountJobsTotal = Number(row.account_jobs_total);
      const jobsTotal = cashJobsTotal + accountJobsTotal;

      const commissionRate = Number(row.driver_commission); // Driver table se commission percentage (e.g., 20)

      // Calculate total commission by applying percentage on each booking's total charges
      let commissionTotal = 0;
      if (row.bookings && Array.isArray(row.bookings)) {
        row.bookings.exports = row.bookings.forEach((item) => {
          const itemTotal = Number(item.total_charges || 0);
          commissionTotal += itemTotal * (commissionRate / 100);
        });
      }
      commissionTotal = Number(commissionTotal.toFixed(2));

      const oldBalance = Number(row.old_balance);
      // Balance calculation formula (Old Balance + Cash Jobs - Commission ya jo aapka business logic ho)
      const currentBalance = Number(
        (oldBalance + cashJobsTotal - commissionTotal).toFixed(2),
      );

      return {
        driver_id: row.driver_id,
        driver: {
          id: row.driver_id,
          username: row.username,
          name: row.driver_name,
          driver_commission: commissionRate,
        },
        bookings_count: row.bookings_count,
        cash_jobs_total: cashJobsTotal.toFixed(2),
        account_jobs_total: accountJobsTotal.toFixed(2),
        jobs_total: jobsTotal.toFixed(2),
        commission_total: commissionTotal.toFixed(2),
        old_balance: oldBalance.toFixed(2),
        current_balance: currentBalance.toFixed(2),
        owed: currentBalance.toFixed(2),
        driver_commission_lineitems: row.bookings,
      };
    });

    return res.status(200).json({
      status: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (err) {
    console.error("❌ Error in getBulkPreview:", err);
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};


// ---------------------------------------------------------
  // CREATE BULK DRIVER COMMISSION
  // ---------------------------------------------------------
exports.createBulk = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING BULK COMMISSION BODY:",
      JSON.stringify(req.body, null, 2),
    );

    let { items, company_id, transaction_date, from_date, to_date } = req.body;

    // ✅ Agar items string ki form mein aaye toh usay JSON array mein parse kar lein
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) {
        return res.status(400).json({
          status: false,
          message: "Invalid JSON format in items array",
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Items array is required for bulk creation",
      });
    }

    // Map and normalize payload items
    const processedItems = items.map((item) => {
      let lineItems = item.driver_commission_lineitems || [];
      // ✅ Agar lineitems bhi string ho toh parse kar lein
      if (typeof lineItems === "string") {
        try {
          lineItems = JSON.parse(lineItems);
        } catch (e) {
          lineItems = [];
        }
      }

      return {
        driver_id: Number(item.driver_id),
        jobs_total: Number(item.jobs_total),
        commission_total: Number(item.commission_total),
        cash_jobs_total: Number(item.cash_jobs_total),
        account_jobs_total: Number(item.account_jobs_total),
        owed: Number(item.owed),
        old_balance: Number(item.old_balance),
        current_balance: Number(item.current_balance),
        transaction_date: transaction_date || item.transaction_date,
        from_date: from_date || item.from_date,
        to_date: to_date || item.to_date,
        company_id: company_id || item.company_id,
        driver_commission_lineitems: lineItems,
      };
    });

    const result = await DriverCommission.bulkCreate(processedItems);

    return res.status(200).json({
      status: true,
      message: "Bulk driver commissions generated successfully",
      count: result.length,
      data: result,
    });
  } catch (err) {
    console.error("❌ Error in createBulk:", err);
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
