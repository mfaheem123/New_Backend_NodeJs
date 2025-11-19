const Surcharge = require("../models/surchargeModel");

module.exports = {
  async add(req, res) {
    try {
      const data = req.body;
      const result = await Surcharge.create(data);

      return res.json({
        status: true,
        message: "Surcharges Add Successfully",
        surcharges: result,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: false, message: "Server Error" });
    }
  },

  async update(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;

      const updated = await Surcharge.update(id, data);

      return res.json({
        status: true,
        message: "Surcharges Update Successfully",
        surcharges: updated,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: false, message: "Server Error" });
    }
  },

  async delete(req, res) {
    try {
      const id = req.params.id;
      const deleted = await Surcharge.delete(id);

      return res.json({
        status: true,
        message: "Surcharges Delete Successfully",
        deleted_id: deleted.id,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: false, message: "Server Error" });
    }
  },

  async getAll(req, res) {
    try {
      const data = await Surcharge.getAll();

      return res.json({
        status: true,
        message: "Surcharges Get Successfully",
        count: data.length,
        surcharges: data,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: false, message: "Server Error" });
    }
  },

  async getOne(req, res) {
    try {
      const id = req.params.id;
      const data = await Surcharge.getById(id);

      return res.json({
        status: true,
        message: "Surcharges Add Successfully",
        surcharge: data,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: false, message: "Server Error" });
    }
  },
async updateActive (req, res) {
  try {
    const { id } = req.params;
    let { active } = req.body;

    // Convert "true"/"false" string → boolean
    if (typeof active === "string") {
      active = active.toLowerCase() === "true";
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        status: false,
        message: "active must be boolean (true/false)"
      });
    }

    const result = await Surcharge.updateActive(id, active);

    if (!result) {
      return res.status(404).json({
        status: false,
        message: "Surcharge not found"
      });
    }

    res.json({
      status: true,
      message: "Active status updated successfully",
      surcharges: result
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
},

};
