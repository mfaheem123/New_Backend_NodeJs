const driverCommissionPayModel = require("../models/driverCommissionPayModel");
const driverModel = require("../models/driverModel");

class DriverCommissionPayController {
  // ---------------------------------------------------------
  // GET LEDGERS
  // ---------------------------------------------------------
  static async getLedgers(req, res) {
    try {
      const offset = parseInt(req.query.offset) || 0;
      const limit = parseInt(req.query.limit) || 100;
      const driver_id = req.query.driver_id;
      const invoice_type = req.query.invoice_type;
      const { company_id } = req.query;

      const { count, rows } = await driverCommissionPayModel.getAll(
        driver_id,
        invoice_type,
        limit,
        offset,
        company_id,
      );

      return res.status(200).json({
        status: true,
        count: count,
        driver_commission_ledgers: rows,
      });
    } catch (error) {
      console.error("Error fetching ledgers:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" });
    }
  }

  // ---------------------------------------------------------
  // GET LEDGER BY ID
  // ---------------------------------------------------------
  static async getLedgerById(req, res) {
    try {
      const { id } = req.params;
      const ledger = await driverCommissionPayModel.getById(id);

      if (!ledger) {
        return res
          .status(404)
          .json({ status: false, message: "Ledger not found" });
      }

      return res.status(200).json({
        status: true,
        driver_commission_ledger: ledger,
      });
    } catch (error) {
      console.error("Error fetching ledger:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" });
    }
  }

  // ---------------------------------------------------------
  // CREATE LEDGER
  // ---------------------------------------------------------
  static async createLedger(req, res) {
    try {
      const {
        driver_id,
        date,
        amount,
        current_balance,
        type,
        invoice_type,
        description,
        company_id,
      } = req.body;

      console.log(
        "🚀 INCOMING ADD DRIVER PAY LEDGER BODY:",
        JSON.stringify(req.body, null, 2),
      );

      if (
        !driver_id ||
        amount === undefined ||
        current_balance === undefined ||
        !type
      ) {
        return res
          .status(400)
          .json({ status: false, message: "Missing required fields" });
      }

      const newLedger = await driverCommissionPayModel.create({
        driver_id,
        date,
        amount,
        current_balance,
        type,
        invoice_type,
        description,
        company_id,
      });

      await driverModel.updateDriverBalance(driver_id, current_balance);

      return res.status(200).json({
        status: true,
        driver_pay_ledger: newLedger,
      });
    } catch (error) {
      console.error("Error creating ledger:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" });
    }
  }

  // ---------------------------------------------------------
  // UPDATE LEDGER
  // ---------------------------------------------------------
  static async updateLedger(req, res) {
    try {
      const { id } = req.params;
      const {
        driver_id,
        date,
        amount,
        current_balance,
        type,
        invoice_type,
        description,
        company_id,
      } = req.body;

      console.log(
        "🚀 INCOMING UPDATE DRIVER PAY LEDGER BODY:",
        JSON.stringify(req.body, null, 2),
      );

      const updatedLedger = await driverCommissionPayModel.update(id, {
        driver_id,
        date,
        amount,
        current_balance,
        type,
        invoice_type,
        description,
        company_id,
      });

      if (!updatedLedger) {
        return res
          .status(404)
          .json({ status: false, message: "Ledger not found" });
      }

      return res.status(200).json({
        status: true,
        driver_pay_ledger: updatedLedger,
      });
    } catch (error) {
      console.error("Error updating ledger:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" });
    }
  }

  // ---------------------------------------------------------
  // DELETE LEDGER
  // ---------------------------------------------------------
  static async deleteLedger(req, res) {
    try {
      const { id } = req.params;
      const deletedLedger = await driverCommissionPayModel.delete(id);

      if (!deletedLedger) {
        return res
          .status(404)
          .json({ status: false, message: "Ledger not found" });
      }

      return res.status(200).json({
        status: true,
        message: "Ledger deleted successfully",
        driver_pay_ledger: deletedLedger,
      });
    } catch (error) {
      console.error("Error deleting ledger:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" });
    }
  }
}

module.exports = DriverCommissionPayController;
