const { error } = require("winston");
const PlotFare = require("../models/plotFareModel");

const formatResponse = (pf) => ({
  id: pf.id,
  vehicle_type_id: pf.vehicle_type_id,
  fares: pf.fares,
  vehicle_type: { name: pf.vehicle_type_name },
  pickup_plot: { id: pf.pickup_plot_id, name: pf.pickup_plot_name },
  dropoff_plot: { id: pf.dropoff_plot_id, name: pf.dropoff_plot_name },
});

exports.getAll = async (req, res) => {
  try {
    const { offset = 0, limit = 100 } = req.query;
    const plotFares = await PlotFare.getAll(offset, limit);
    res.json({
      status: true,
      count: plotFares.length,
      plot_fares: plotFares.map(formatResponse),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING PLOT FARE ADD BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const newPlotFare = await PlotFare.create(req.body);
    res.json({
      status: true,
      plot_fare: [formatResponse(newPlotFare)],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await PlotFare.update(id, req.body);
    if (!updated)
      return res
        .status(404)
        .json({ status: false, message: "Plot Fare not found" });

    res.json({
      status: true,
      updated_plot_fare: formatResponse(updated),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PlotFare.delete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ status: false, message: "Plot Fare not found" });

    res.json({
      status: true,
      message: "Plot Fare Deleted Successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.getByID = async (req, res) => {
  try {
    const { id } = req.params;
    const plotFares = await PlotFare.getById(id);
    if (!plotFares) {
      return res.status(404).json({
        status: false,
        message: "Plot Fare Not Found",
      });
    }
    res.status(200).json({
      status: true,
      plot_fare: [formatResponse(plotFares)],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.message,
    });
  }
};
