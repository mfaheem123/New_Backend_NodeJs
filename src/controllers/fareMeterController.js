const FareMeter = require("../models/fareMeterModel");
const pool = require("../db");
module.exports = {
  async getAll(req, res) {
    try {
      const result = await FareMeter.getAll();

      const formatted = result.rows.map((row) => ({
        id: row.id,
        has_meter: row.has_meter,
        autostart_wait: row.autostart_wait,
        autostart_waiting_speed_limit: row.autostart_waiting_speed_limit,
        autostart_waiting_time: row.autostart_waiting_time,
        autostop_waiting_speed_limit: row.autostop_waiting_speed_limit,
        waiting_charges: row.waiting_charges,
        waiting_intervals: row.waiting_intervals,
        vehicle_type_id: row.vehicle_type_id,
        vehicle_type: { name: row.vehicle_type },
      }));

      res.json({
        status: true,
        count: formatted.length,
        fareMeters: formatted,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  async getById(req, res) {
    try {
      const result = await FareMeter.getById(req.params.id);

      if (result.rowCount === 0)
        return res.status(404).json({ status: false, message: "Not found" });

      const row = result.rows[0];
      res.json({
        status: true,
        fareMeter: {
          id: row.id,
          has_meter: row.has_meter,
          autostart_wait: row.autostart_wait,
          autostart_waiting_speed_limit: row.autostart_waiting_speed_limit,
          autostart_waiting_time: row.autostart_waiting_time,
          autostop_waiting_speed_limit: row.autostop_waiting_speed_limit,
          waiting_charges: row.waiting_charges,
          waiting_intervals: row.waiting_intervals,
          vehicle_type_id: row.vehicle_type_id,
          vehicle_type: { name: row.vehicle_type },
        },
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  async create(req, res) {
    try {
      const result = await FareMeter.create(req.body);

      const row = result.rows[0];
      res.json({
        status: true,
        fareMeter: {
          ...row,
          vehicle_type: { name: req.body.vehicle_type_name || "" },
        },
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  async update(req, res) {
    try {
      const data = { ...req.body };
      console.log("🚀 Incoming req.body:", JSON.stringify(req.body, null, 2));
      // Convert waiting_charges string to JSON array if needed
      if (data.waiting_charges && typeof data.waiting_charges === "string") {
        try {
          data.waiting_charges = JSON.parse(data.waiting_charges);
        } catch (e) {
          data.waiting_charges = [];
        }
      }

      const result = await FareMeter.update(req.params.id, data);

      if (result.rowCount === 0)
        return res.status(404).json({ status: false, message: "Not found" });

      const row = result.rows[0];

      const waitingCharges = Array.isArray(row.waiting_charges)
        ? row.waiting_charges
        : JSON.parse(row.waiting_charges || "[]");
      // Get vehicle type name
      const vehicleResult = await pool.query(
        "SELECT name FROM vehicle_types WHERE id = $1",
        [row.vehicle_type_id]
      );
      const vehicleName = vehicleResult.rowCount
        ? vehicleResult.rows[0].name
        : "";

      res.json({
        status: true,
        fareMeter: {
          id: row.id,
          has_meter: row.has_meter,
          autostart_wait: row.autostart_wait,
          autostart_waiting_speed_limit: row.autostart_waiting_speed_limit,
          autostart_waiting_time: row.autostart_waiting_time,
          autostop_waiting_speed_limit: row.autostop_waiting_speed_limit,
          waiting_charges: waitingCharges,
          waiting_intervals: row.waiting_intervals,
          vehicle_type_id: row.vehicle_type_id,
           vehicle_type: { name: vehicleName }
        },
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  async delete(req, res) {
    try {
      const result = await FareMeter.delete(req.params.id);

      if (result.rowCount === 0)
        return res.status(404).json({ status: false, message: "Not found" });

      res.json({ status: true, message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};
