const Location = require("../models/locationModel");

const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      name,
      postcode,
      shortcut,
      address,
      location_type,
      zone,
    } = req.query;

    const { locations, total } = await Location.getAll({
      page: Number(page),
      limit: Number(limit),
      name,
      postcode,
      shortcut,
      address,
      location_type,
      zone,
    });

    res.json({
      status: true,
      page: Number(page),
      limit: Number(limit),
      total,
      total_pages: Math.ceil(total / limit),
      count: locations.length,
      locations,
    });
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const location = await Location.getById(id);
    if (!location)
      return res
        .status(404)
        .json({ status: false, message: "Location not found" });
    res.json({ status: true, location });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// const create = async (req, res) => {
//   try {
//     const newLoc = await Location.create(req.body);
//     res.status(200).json({ status: true,message:"Create Location Successfully" ,location: newLoc });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ status: false, message: 'Server error' });
//   }
// };

const create = async (req, res) => {
  try {
    const toNumberOrZero = (value) => {
      return value ? parseFloat(value) : 0.00;
    };

    // Convert empty strings to null
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "") req.body[key] = null;
    });

    // Explicit type conversions based on your table structure
    req.body.zone_id = req.body.zone_id ? parseInt(req.body.zone_id) : null;
    req.body.location_type_id = req.body.location_type_id
      ? parseInt(req.body.location_type_id)
      : null;

    // req.body.extra_charges = req.body.extra_charges
    //   ? parseFloat(req.body.extra_charges)
    //   : 0;
    // req.body.pickup_charges = req.body.pickup_charges
    //   ? parseFloat(req.body.pickup_charges)
    //   : 0;
    // req.body.dropoff_charges = req.body.dropoff_charges
    //   ? parseFloat(req.body.dropoff_charges)
    //   : 0;
    req.body.extra_charges = toNumberOrZero(req.body.extra_charges);
    req.body.pickup_charges = toNumberOrZero(req.body.pickup_charges);
    req.body.dropoff_charges = toNumberOrZero(req.body.dropoff_charges);

    req.body.latitude = req.body.latitude
      ? parseFloat(req.body.latitude)
      : null;
    req.body.longitude = req.body.longitude
      ? parseFloat(req.body.longitude)
      : null;

    // Convert "true"/"false" strings to boolean
    if (req.body.blacklist === "true" || req.body.blacklist === true)
      req.body.blacklist = true;
    else if (req.body.blacklist === "false" || req.body.blacklist === false)
      req.body.blacklist = false;
    else req.body.blacklist = false; // default

    const newLoc = await Location.create(req.body);
    res.status(200).json({
      status: true,
      message: "Create Location Successfully",
      location: newLoc,
    });
  } catch (err) {
    console.error("Error creating location:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 🧹 Remove empty or null fields completely
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "" || req.body[key] === null) delete req.body[key];
    });

    // 🎯 Type conversions — only if field exists
    if (req.body.zone_id !== undefined)
      req.body.zone_id = parseInt(req.body.zone_id);

    if (req.body.location_type_id !== undefined)
      req.body.location_type_id = parseInt(req.body.location_type_id);

    if (req.body.extra_charges !== undefined)
      req.body.extra_charges = parseFloat(req.body.extra_charges);

    if (req.body.pickup_charges !== undefined)
      req.body.pickup_charges = parseFloat(req.body.pickup_charges);

    if (req.body.dropoff_charges !== undefined)
      req.body.dropoff_charges = parseFloat(req.body.dropoff_charges);

    if (req.body.latitude !== undefined)
      req.body.latitude = parseFloat(req.body.latitude);

    if (req.body.longitude !== undefined)
      req.body.longitude = parseFloat(req.body.longitude);

    // 🧠 Convert blacklist strings/booleans
    if (req.body.blacklist !== undefined) {
      req.body.blacklist =
        req.body.blacklist === "true" || req.body.blacklist === true;
    }

    // 💾 Perform update
    const updated = await Location.update(id, req.body);

    if (!updated) {
      return res
        .status(404)
        .json({ status: false, message: "Location not found" });
    }

    res.json({
      status: true,
      message: "Update Location Successfully",
      location: updated,
    });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await Location.remove(id);
    if (!deleted)
      return res
        .status(404)
        .json({ status: false, message: "Location not found" });
    res.json({
      status: true,
      message: "Delete Location Successfully",
      location: deleted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

module.exports = { getAll, getById, create, update, remove };
