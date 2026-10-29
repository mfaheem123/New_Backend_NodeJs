const DriverRent = require("../models/driverRentModel");

/* ================= CREATE ================= */

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD DRIVER RENT BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const result = await DriverRent.create(req.body);

    return res.status(200).json({
      status: true,
      driver_rent: result.rent,
      driver_rent_lineitems: {
        status: true,
        driver_rent_lineitems: result.lineItems,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= DISTINCT ================= */

exports.getDistinct = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    const company_id = req.query.company_id;

    const result = await DriverRent.getDistinct(offset, limit, company_id);

    return res.json({
      status: true,
      count: result.count,
      driver_rents: result.driver_rents,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= GET BY DRIVER ID ================= */

exports.getByDriverId = async (req, res) => {
  try {
    const { driver_id, company_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const rents = await DriverRent.getByDriverId(driver_id, company_id);

    return res.json({
      status: true,
      count: rents.length,
      driver_rents: rents,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= GET BY ID ================= */

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "id is required",
      });
    }

    const rent = await DriverRent.getById(id);

    if (!rent) {
      return res.status(404).json({
        status: false,
        message: "Driver rent not found",
      });
    }

    return res.json({
      status: true,
      driver_rent: rent,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "rent id is required",
      });
    }

    const result = await DriverRent.update(id, req.body);

    return res.status(200).json({
      status: true,
      driver_rent: result,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "rent id is required",
      });
    }

    await DriverRent.delete(id);

    return res.status(200).json({
      status: true,
      message: "Driver rent deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= GET BULK PREVIEW ================= */

exports.getBulkPreview = async (req, res) => {
  try {
    const { company_id, from_date, to_date } = req.query;

    if (!company_id || !from_date || !to_date) {
      return res.status(400).json({
        status: false,
        message: "company_id, from_date, and to_date are required",
      });
    }

    const reportData = await DriverRent.getBulkPreview(
      company_id,
      from_date,
      to_date,
    );

    const formattedData = reportData.map((row) => {
      const cashJobsTotal = Number(row.cash_jobs_total);
      const accountJobsTotal = Number(row.account_jobs_total);
      const jobsTotal = cashJobsTotal + accountJobsTotal;

      const rentRate = Number(row.driver_rent); // Rent percentage / fixed amount logic

      let rentTotal = 0;
      if (row.bookings && Array.isArray(row.bookings)) {
        row.bookings.forEach((item) => {
          const itemTotal = Number(item.total_charges || 0);
          rentTotal += itemTotal * (rentRate / 100);
        });
      }
      rentTotal = Number(rentTotal.toFixed(2));

      const oldBalance = Number(row.old_balance);
      const currentBalance = Number(
        (oldBalance + cashJobsTotal - rentTotal).toFixed(2),
      );

      return {
        driver_id: row.driver_id,
        driver: {
          id: row.driver_id,
          username: row.username,
          name: row.driver_name,
          driver_rent: rentRate,
        },
        bookings_count: row.bookings_count,
        cash_jobs_total: cashJobsTotal.toFixed(2),
        account_jobs_total: accountJobsTotal.toFixed(2),
        jobs_total: jobsTotal.toFixed(2),
        rent_total: rentTotal.toFixed(2),
        old_balance: oldBalance.toFixed(2),
        current_balance: currentBalance.toFixed(2),
        owed: currentBalance.toFixed(2),
        driver_rent_lineitems: row.bookings,
      };
    });

    return res.status(200).json({
      status: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (err) {
    console.error("❌ Error in getBulkPreview (Rent):", err);
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

/* ================= CREATE BULK RENTS ================= */

exports.createBulk = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING BULK RENT BODY:",
      JSON.stringify(req.body, null, 2),
    );

    let { items, company_id, transaction_date, from_date, to_date } = req.body;

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

    const processedItems = items.map((item) => {
      let lineItems = item.driver_rent_lineitems || [];
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
        rent_total: Number(item.rent_total),
        cash_jobs_total: Number(item.cash_jobs_total),
        account_jobs_total: Number(item.account_jobs_total),
        owed: Number(item.owed),
        old_balance: Number(item.old_balance),
        current_balance: Number(item.current_balance),
        transaction_date: transaction_date || item.transaction_date,
        from_date: from_date || item.from_date,
        to_date: to_date || item.to_date,
        company_id: company_id || item.company_id,
        driver_rent_lineitems: lineItems,
      };
    });

    const result = await DriverRent.bulkCreate(processedItems);

    return res.status(200).json({
      status: true,
      message: "Bulk driver rents generated successfully",
      count: result.length,
      data: result,
    });
  } catch (err) {
    console.error("❌ Error in createBulk (Rent):", err);
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
