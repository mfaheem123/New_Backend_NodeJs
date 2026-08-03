const SinbinModel = require("../models/driverSinbinModel");
const SettingsModel = require("../models/driverSinbinModelsettingsModel");

// ---------------------------------------------------------
// ADD OR UPDATE DRIVER SIN BIN STATUS
// ---------------------------------------------------------
exports.toggleDriverSinbin = async (req, res) => {
  try {
    const { company_id, driver_id, message, sinbin_time } = req.body;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id is required" });
    }

    await SinbinModel.updateDriverSinbin(company_id, {
      driver_id,
      message,
      sinbin_time,
    });

    return res.status(200).json({ status: true });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// ---------------------------------------------------------
// GET ALL SIN BIN ACTIVE DRIVERS
// ---------------------------------------------------------
exports.getSinbinDrivers = async (req, res) => {
  try {
    const company_id = req.query.company_id;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id query param is required" });
    }

    const drivers = await SinbinModel.getActiveSinbinDrivers(company_id);

    return res.status(200).json({
      status: true,
      count: drivers.length,
      drivers: drivers,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 3. Get Sin Bin Settings (GET)
exports.getSinbinSettings = async (req, res) => {
  try {
    const company_id = req.query.company_id;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id query param is required" });
    }

    let settings = await SettingsModel.getByCompanyId(company_id);

    if (!settings) {
      settings = { id: 0, recoverjob: 0, rejectjob: 0, ignorejob: 0 };
    }

    return res.status(200).json({
      status: true,
      sinbin: settings,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 4. Update Sin Bin Settings (POST)
exports.updateSinbinSettings = async (req, res) => {
  try {
    const { company_id, ignoreJob, recoverJob, rejectJob } = req.body;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id is required" });
    }

    const updatedSettings = await SettingsModel.upsertSettings(company_id, {
      recoverJob,
      rejectJob,
      ignoreJob,
    });

    return res.status(200).json({
      status: true,
      sinbin_settings: {
        id: updatedSettings.id,
        recoverjob: String(updatedSettings.recoverjob),
        rejectjob: String(updatedSettings.rejectjob),
        ignorejob: String(updatedSettings.ignorejob),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
