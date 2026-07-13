const Localization = require("../models/localizationModel");

exports.getAll = async (req, res) => {
  try {
    const { company_id } = req.query;
    const localizations = await Localization.getAll(company_id);
    res.json({
      status: true,
      count: localizations.length,
      localizationdetail: localizations,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const localization = await Localization.getById(req.params.id);
    if (!localization) {
      return res
        .status(404)
        .json({ status: false, message: "Localization not found" });
    }
    res.json({ status: true, localization });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD LOCALIZATION BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const newLoc = await Localization.create(req.body);
    res.json({ status: true, localization: newLoc });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Localization.update(req.params.id, req.body);
    res.json({ status: true, localization: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Localization.delete(req.params.id);
    res.json({ status: true, message: "Localization deleted successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
