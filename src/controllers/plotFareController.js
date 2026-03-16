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

// exports.create = async (req, res) => {
//   try {
//     console.log(
//       "🚀 INCOMING PLOT FARE ADD BODY:",
//       JSON.stringify(req.body, null, 2),
//     );
//     const newPlotFare = await PlotFare.create(req.body);
//     res.json({
//       status: true,
//       plot_fare: [formatResponse(newPlotFare)],
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ status: false, error: err.message });
//   }
// };

// MULTIPLE DATA INSERT
exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING PLOT FARE ADD BODY:",
      JSON.stringify(req.body, null, 2)
    );

    let data = req.body;

    // Parse if stringified arrays
    if (typeof data.pickup_plot_id === "string" && data.pickup_plot_id.startsWith("[")) {
      data.pickup_plot_id = JSON.parse(data.pickup_plot_id);
    }
    if (typeof data.dropoff_plot_id === "string" && data.dropoff_plot_id.startsWith("[")) {
      data.dropoff_plot_id = JSON.parse(data.dropoff_plot_id);
    }

    const pickupArray = Array.isArray(data.pickup_plot_id) ? data.pickup_plot_id : [data.pickup_plot_id];
    const dropoffArray = Array.isArray(data.dropoff_plot_id) ? data.dropoff_plot_id : [data.dropoff_plot_id];

    const finalPayload = [];

    // 🔥 Cartesian Product Logic
    for (const pickup of pickupArray) {
      for (const dropoff of dropoffArray) {
        finalPayload.push({
          vehicle_type_id: data.vehicle_type_id,
          pickup_plot_id: typeof pickup === "object" ? Object.values(pickup)[0] : pickup,
          dropoff_plot_id: typeof dropoff === "object" ? Object.values(dropoff)[0] : dropoff,
          fares: data.fares,
        });
      }
    }

    const newPlotFares = await PlotFare.create(finalPayload);

    res.json({
      status: true,
      message: "Plot Fares Created Successfully",
      plot_fares: newPlotFares,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      error: err.message,
    });
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
