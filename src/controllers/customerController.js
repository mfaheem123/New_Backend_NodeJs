const Customer = require("../models/customerModel");

module.exports = {
  createCustomer: async (req, res) => {
    try {
      console.log(
        "🚀 INCOMING CUSTOMER ADD BODY:",
        JSON.stringify(req.body, null, 2)
      );

      const customerId = await Customer.create(req.body);

      let restrictedDrivers = [];

      if (req.body.restricted_drivers) {
        console.log(
          "🧾 Raw restricted_drivers type:",
          typeof req.body.restricted_drivers
        );
        console.log(
          "🧾 Raw restricted_drivers value:",
          req.body.restricted_drivers
        );

        if (typeof req.body.restricted_drivers === "string") {
          try {
            restrictedDrivers = JSON.parse(req.body.restricted_drivers);
            console.log(
              "✅ Parsed restricted_drivers (from string):",
              restrictedDrivers
            );
          } catch (err) {
            console.warn(
              "⚠️ Failed to parse restricted_drivers JSON:",
              err.message
            );
            restrictedDrivers = [];
          }
        } else if (Array.isArray(req.body.restricted_drivers)) {
          restrictedDrivers = req.body.restricted_drivers;
          console.log(
            "✅ restricted_drivers is already an array:",
            restrictedDrivers
          );
        } else {
          console.warn(
            "⚠️ Unexpected type for restricted_drivers:",
            typeof req.body.restricted_drivers
          );
        }

        if (restrictedDrivers.length > 0) {
          console.log(
            `🚀 Inserting ${restrictedDrivers.length} restricted drivers for customer ID: ${customerId}`
          );
          await Customer.setRestrictedDrivers(customerId, restrictedDrivers);
        } else {
          console.log("ℹ️ No valid restricted drivers found to insert.");
        }
      } else {
        console.log("ℹ️ No restricted_drivers field in payload.");
      }

      const customer = {
        id: customerId,
        name: req.body.name || null,
        email: req.body.email || null,
        mobile: req.body.mobile || null,
        telephone: req.body.telephone || null,
        fax: req.body.fax || null,
        door_number: req.body.door_number || null,
        address1: req.body.address1 || null,
        address2: req.body.address2 || null,
        blacklist: req.body.blacklist || false,
        blacklist_reason: req.body.blacklist_reason || null,
        notes: req.body.notes || null,
        username: req.body.username || null,
        password: req.body.password || null,
        web_device_id: req.body.web_device_id || null,
        mobile_device_id: req.body.mobile_device_id || null,
        email_verification_code: req.body.email_verification_code || null,
        mobile_verification_code: req.body.mobile_verification_code || null,
        email_verified: req.body.email_verified || null,
        mobile_verified: req.body.mobile_verified || null,
        email_verified_at: req.body.email_verified_at || null,
        mobile_verified_at: req.body.mobile_verified_at || null,
        restricted_drivers: restrictedDrivers,
        sms_flag: req.body.sms_flag ?? true,
      };

      console.log("✅ Final customer object to be returned:", customer);

      res.json({ status: true, customer });
    } catch (err) {
      console.error("❌ Error creating customer:", err);
      res.status(500).json({ status: false, error: err.message });
    }
  },

  // GET /api/customers
  getAllCustomers: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        blacklist = false,
        ...filters
      } = req.query;

      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const offset = (pageInt - 1) * limitInt;

      const result = await Customer.getAll({
        offset,
        limit: limitInt,
        blacklist: blacklist === "true",
        filters,
      });

      res.status(200).json({
        status: true,
        page: pageInt,
        limit: limitInt,
        total: result.total,
        total_pages: Math.ceil(result.total / limitInt),
        count: result.customers.length,
        customers: result.customers,
      });
    } catch (err) {
      console.error("Error fetching customers:", err);
      res
        .status(500)
        .json({ status: false, message: "Server error", error: err.message });
    }
  },

  // GET /api/customer/:id
  getCustomerById: async (req, res) => {
    try {
      const customer = await Customer.getById(req.params.id);
      if (!customer)
        return res
          .status(404)
          .json({ status: false, message: "Customer not found" });
      res.json({ status: true, customer });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, error: err.message });
    }
  },

  // PUT /api/customer/:id
  updateCustomer: async (req, res) => {
    try {
      const id = req.params.id;
      const data = req.body;

      console.log(
      "🚀 INCOMING CUSTOMER UPDATE BODY:",
      JSON.stringify(req.body, null, 2)
    );

      // Step 1: Update normal fields dynamically
      await Customer.update(id, data);

      // Step 2: Handle restricted drivers if provided
      if (data.restricted_drivers) {
        let restrictedDrivers = [];

        if (typeof data.restricted_drivers === "string") {
          try {
            restrictedDrivers = JSON.parse(data.restricted_drivers);
          } catch (err) {
            console.warn("⚠️ Could not parse restricted_drivers:", err.message);
          }
        } else if (Array.isArray(data.restricted_drivers)) {
          restrictedDrivers = data.restricted_drivers;
        }

        console.log(
          `🚀 Updating ${restrictedDrivers.length} restricted drivers for customer ID: ${id}`
        );
        await Customer.setRestrictedDrivers(id, restrictedDrivers);
      }

      // Step 3: Fetch full updated record
      const updatedCustomer = await Customer.getById(id);
      const restrictedDrivers = await Customer.getRestrictedDrivers(id);
      updatedCustomer.restricted_drivers = restrictedDrivers;

      res.json({ status: true, customer: updatedCustomer });
    } catch (err) {
      console.error("❌ Error updating customer:", err);
      res.status(500).json({ status: false, error: err.message });
    }
  },

  // DELETE /api/customer/:id
  deleteCustomer: async (req, res) => {
    try {
      const id = req.params.id;

      console.log("🗑️ Deleting customer with ID:", id);

      const deleted = await Customer.delete(id);

      if (!deleted) {
        return res
          .status(404)
          .json({ status: false, message: "Customer not found" });
      }

      res.json({
        status: true,
        message: "Customer Deleted Successfully",
      });
    } catch (err) {
      console.error("❌ Error deleting customer:", err);
      res.status(500).json({ status: false, error: err.message });
    }
  },
};
