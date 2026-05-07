const driverFeatures = require("../models/driverAppFeaturesModel");

exports.updateDriverAppFeatures = async (req, res) => {
  try {
    const { driver_id, ...features } = req.body;
    console.log(req.body);
    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const updated = await driverFeatures.updateFeatures(driver_id, features);

    if (!updated) {
      return res.status(400).json({
        status: false,
        message: "No valid fields provided for update",
      });
    }

    return res.json({
      status: true,
      appFeatures: [
        {
          id: updated.id,
          driver_id: updated.driver_id,
          features: updated,
        },
      ],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.getDriverAppFeatures = async (req, res) => {
  try {
    const { driver_id, company_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const f = await driverFeatures.getByDriverId(driver_id, company_id);

    if (!f) {
      return res.status(404).json({
        status: false,
        message: "Driver app features not found",
      });
    }

    return res.json({
      status: true,
      appFeatures: [
        {
          id: f.id,
          driver_id: f.driver_id,
          features: { ...f },
        },
      ],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
