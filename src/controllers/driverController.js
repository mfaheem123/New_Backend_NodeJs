const Driver = require("../models/driverModel");
const {
  notifyDriverLogin,
  notifyDriverLogout,
} = require("../sockets/driverWebSocket");
// const { getIO } = require("../sockets/io");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db");
const BASE_URL = process.env.BASE_URL || "http://192.168.100.93:5000/uploads/";

// const io = getIO();

// Helper: Recursively convert empty strings ("") to null
function cleanEmptyToNull(obj) {
  if (Array.isArray(obj)) return obj.map(cleanEmptyToNull);
  if (obj && typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === "") cleaned[key] = null;
      else if (typeof value === "object")
        cleaned[key] = cleanEmptyToNull(value);
      else cleaned[key] = value;
    }
    return cleaned;
  }
  return obj;
}

function normalizeDateFields(obj) {
  const dateKeys = [
    "dob",
    "start_date",
    "end_date",
    "licence_expiry",
    "phc_driver_expiry",
    "insurance_expiry",
    "rental_agreement_expiry",
    "road_tax_expiry",
    "v5_registration_expiry",
    "mot_expiry",
    "mot2_expiry",
    "phc_vehicle_expiry",
  ];

  for (const key of dateKeys) {
    if (obj[key]) {
      obj[key] = obj[key].split("T")[0]; // remove any time if present
    }
  }
  return obj;
}

// LOG BOOK DOCUMENT HANDLE IN THIS CREATE CODE
exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING DRIVER ADD BODY:",
      JSON.stringify(req.body, null, 2),
    );
    console.log("🚀 INCOMING DRIVER ADD FILES:", req.files);

    // Clean nulls & normalize dates
    req.body = cleanEmptyToNull(req.body);
    req.body = normalizeDateFields(req.body);

    // Boolean fields
    const booleanFields = [
      "rent_paid",
      "has_pda",
      "use_company_vehicle",
      "active",
    ];
    booleanFields.forEach((field) => {
      if (field in req.body) {
        const val = req.body[field];
        req.body[field] =
          val === true || val === "true" || val === 1 || val === "1";
      }
    });

    // Numeric fields
    const numericFields = [
      "driver_commission",
      "rent_limit",
      "balance",
      "subsidiary_id",
      "pda_rent",
    ];
    numericFields.forEach((field) => {
      if (field in req.body && req.body[field] !== null) {
        req.body[field] = Number(req.body[field]);
      }
    });

    // Uploaded files
    const uploadedFiles = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(
        (file) =>
          (uploadedFiles[file.fieldname] = `${BASE_URL}${file.filename}`),
      );
    }
    if (uploadedFiles.image) req.body.image = uploadedFiles.image;

    // Parse JSON fields
    const jsonFields = [
      "notes",
      "shifts",
      "vehicle",
      "MOT",
      "MOT2",
      "INSURANCE",
      "PHC_VEHICLE",
      "ROAD_TAX",
      "RENTAL_AGREEMENT",
      "V5_REGISTRATION",
      "LICENCE",
      "PHC_DRIVER",
    ];
    jsonFields.forEach((key) => {
      if (typeof req.body[key] === "string") {
        try {
          req.body[key] = JSON.parse(req.body[key]);
        } catch {
          req.body[key] = key === "vehicle" ? {} : [];
        }
      }
    });

    // Merge document fields into vehicle object
    const docMap = {
      log_book: {
        number: "log_book_number",
        document: "log_book_document",
      },
      MOT: {
        number: "mot_number",
        expiry: "mot_expiry",
        expiry_time: "mot_expiry_time",
        document: "MOT_DOCUMENT",
      },
      MOT2: {
        number: "mot2_number",
        expiry: "mot2_expiry",
        expiry_time: "mot2_expiry_time",
        document: "MOT2_DOCUMENT",
      },
      INSURANCE: {
        number: "insurance_number",
        expiry: "insurance_expiry",
        expiry_time: "insurance_expiry_time",
        document: "INSURANCE_DOCUMENT",
      },
      PHC_VEHICLE: {
        number: "phc_vehicle_number",
        expiry: "phc_vehicle_expiry",
        expiry_time: "phc_vehicle_expiry_time",
        document: "PHC_VEHICLE_DOCUMENT",
      },
      ROAD_TAX: {
        number: "road_tax_number",
        expiry: "road_tax_expiry",
        expiry_time: "road_tax_expiry_time",
        document: "ROAD_TAX_DOCUMENT",
      },
      RENTAL_AGREEMENT: {
        number: "rental_agreement_number",
        expiry: "rental_agreement_expiry",
        expiry_time: "rental_agreement_expiry_time",
        document: "RENTAL_AGREEMENT_DOCUMENT",
      },
      V5_REGISTRATION: {
        number: "v5_registration_number",
        expiry: "v5_registration_expiry",
        expiry_time: "v5_registration_expiry_time",
        document: "V5_REGISTRATION_DOCUMENT",
      },
      LICENCE: {
        number: "licence_number",
        expiry: "licence_expiry",
        expiry_time: "licence_expiry_time",
        document: "LICENCE_DOCUMENT",
      },
      PHC_DRIVER: {
        number: "phc_driver_number",
        expiry: "phc_driver_expiry",
        expiry_time: "phc_driver_expiry_time",
        document: "PHC_DRIVER_DOCUMENT",
      },
    };

    if (!req.body.vehicle) req.body.vehicle = {};
    Object.keys(docMap).forEach((key) => {
      const map = docMap[key];
      if (req.body[key]) {
        const doc = req.body[key];
        req.body.vehicle[map.number] = doc[map.number] || null;
        req.body.vehicle[map.expiry] = doc[map.expiry] || null;
        req.body.vehicle[map.expiry_time] = doc[map.expiry_time] || null;

        // Map uploaded files
        if (req.files && req.files.length > 0) {
          const file = req.files.find((f) => f.fieldname === map.document);
          req.body.vehicle[map.document] = file
            ? `${BASE_URL}${file.filename}`
            : null;
        } else {
          req.body.vehicle[map.document] = null;
        }

        // Also merge into top-level driver object
        req.body[map.number] = req.body.vehicle[map.number];
        req.body[map.expiry] = req.body.vehicle[map.expiry];
        req.body[map.expiry_time] = req.body.vehicle[map.expiry_time];
      }
    });

    // ✅ Handle log book document separately
    if (req.files && req.files.length > 0) {
      const logBookFile = req.files.find(
        (f) => f.fieldname === "log_book_document",
      );
      if (logBookFile) {
        if (!req.body.vehicle) req.body.vehicle = {};
        req.body.vehicle.log_book_document = `${BASE_URL}${logBookFile.filename}`;
      }
    }

    // If company vehicle is used, remove private vehicle to avoid insertion
    if (req.body.use_company_vehicle && req.body.company_vehicle_id) {
      req.body.vehicle = null;
    }
    // STEP 1: Check if username exists
    const usernameExists = await Driver.checkUsernameExists(req.body.username);

    if (usernameExists) {
      return res.status(400).json({
        message: "Username Already Exists",
      });
    }

    const driverData = cleanEmptyToNull(req.body);
    const result = await Driver.create(driverData);

    const fullDriver = await Driver.getById(result.id);

    res.status(200).json({
      status: true,
      message: "Driver created successfully",
      driver: fullDriver,
    });
  } catch (err) {
    console.error("❌ Error creating driver:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};

// Get All Drivers
exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      username,
      name,
      mobile,
      mot_expiry,
      mot2_expiry,
      insurance_expiry,
      licence_expiry,
      driver_end_date,
      vehicle_end_date,
      vehicle_type,
      subsidiary,
      active = true,
    } = req.query;

    const { total, drivers } = await Driver.getAll({
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      username,
      name,
      mobile,
      mot_expiry,
      mot2_expiry,
      insurance_expiry,
      licence_expiry,
      driver_end_date,
      vehicle_end_date,
      vehicle_type,
      subsidiary,
      active,
    });

    res.json({
      status: true,
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      total,
      total_pages: Math.ceil(total / limit),
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

// Get Drivers by Driver ID
exports.getById = async (req, res) => {
  try {
    const driver = await Driver.getById(req.params.id);
    if (!driver)
      return res
        .status(404)
        .json({ status: false, message: "Driver not found" });

    res.json({ status: true, driver });
  } catch (err) {
    console.error("Error fetching driver:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};

// Update Driver By ID
exports.update = async (req, res) => {
  try {
    const driverId = req.params.id;
    console.log(
      "🚀 INCOMING DRIVER UPDATE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    console.log("🚀 INCOMING DRIVER UPDATE FILES:", req.files);

    // Clean nulls & normalize dates
    req.body = cleanEmptyToNull(req.body);
    req.body = normalizeDateFields(req.body);

    // Boolean fields
    const booleanFields = [
      "rent_paid",
      "has_pda",
      "use_company_vehicle",
      "active",
    ];
    booleanFields.forEach((field) => {
      if (field in req.body) {
        const val = req.body[field];
        req.body[field] =
          val === true || val === "true" || val === 1 || val === "1";
      }
    });

    // Numeric fields
    const numericFields = [
      "driver_commission",
      "rent_limit",
      "balance",
      "subsidiary_id",
      "pda_rent",
    ];
    numericFields.forEach((field) => {
      if (field in req.body && req.body[field] !== null) {
        req.body[field] = Number(req.body[field]);
      }
    });

    // Uploaded files
    const uploadedFiles = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(
        (file) =>
          (uploadedFiles[file.fieldname] = `${BASE_URL}${file.filename}`),
      );
    }

    // ✅ Handle driver image (update if new file provided)
    if (uploadedFiles.image) {
      req.body.image = uploadedFiles.image;
    }

    // Parse JSON fields
    const jsonFields = [
      "notes",
      "shifts",
      "vehicle",
      "MOT",
      "MOT2",
      "INSURANCE",
      "PHC_VEHICLE",
      "ROAD_TAX",
      "RENTAL_AGREEMENT",
      "V5",
      "LICENCE",
      "PHC_DRIVER",
      "LOG_BOOK", // ✅ Added for log book consistency
    ];

    jsonFields.forEach((key) => {
      if (typeof req.body[key] === "string") {
        try {
          req.body[key] = JSON.parse(req.body[key]);
        } catch {
          req.body[key] = key === "vehicle" ? {} : [];
        }
      }
    });

    // Merge document fields into vehicle object
    const docMap = {
      log_book: {
        number: "log_book_number",
        document: "log_book_document",
      },
      MOT: {
        number: "mot_number",
        expiry: "mot_expiry",
        expiry_time: "mot_expiry_time",
        document: "MOT_DOCUMENT",
      },
      MOT2: {
        number: "mot2_number",
        expiry: "mot2_expiry",
        expiry_time: "mot2_expiry_time",
        document: "MOT2_DOCUMENT",
      },
      INSURANCE: {
        number: "insurance_number",
        expiry: "insurance_expiry",
        expiry_time: "insurance_expiry_time",
        document: "INSURANCE_DOCUMENT",
      },
      PHC_VEHICLE: {
        number: "phc_vehicle_number",
        expiry: "phc_vehicle_expiry",
        expiry_time: "phc_vehicle_expiry_time",
        document: "PHC_VEHICLE_DOCUMENT",
      },
      ROAD_TAX: {
        number: "road_tax_number",
        expiry: "road_tax_expiry",
        expiry_time: "road_tax_expiry_time",
        document: "ROAD_TAX_DOCUMENT",
      },
      RENTAL_AGREEMENT: {
        number: "rental_agreement_number",
        expiry: "rental_agreement_expiry",
        expiry_time: "rental_agreement_expiry_time",
        document: "RENTAL_AGREEMENT_DOCUMENT",
      },
      V5: {
        number: "v5_registration_number",
        expiry: "v5_registration_expiry",
        expiry_time: "v5_registration_expiry_time",
        document: "V5_DOCUMENT",
      },
      LICENCE: {
        number: "licence_number",
        expiry: "licence_expiry",
        expiry_time: "licence_expiry_time",
        document: "LICENCE_DOCUMENT",
      },
      PHC_DRIVER: {
        number: "phc_driver_number",
        expiry: "phc_driver_expiry",
        expiry_time: "phc_driver_expiry_time",
        document: "PHC_DRIVER_DOCUMENT",
      },
    };

    if (!req.body.vehicle) req.body.vehicle = {};

    Object.keys(docMap).forEach((key) => {
      const map = docMap[key];
      if (req.body[key]) {
        const doc = req.body[key];
        req.body.vehicle[map.number] = doc[map.number] || null;
        req.body.vehicle[map.expiry] = doc[map.expiry] || null;
        req.body.vehicle[map.expiry_time] = doc[map.expiry_time] || null;

        // Map uploaded files
        if (uploadedFiles[map.document]) {
          req.body.vehicle[map.document] = uploadedFiles[map.document];
        }

        // Also merge into top-level driver object
        req.body[map.number] = req.body.vehicle[map.number];
        req.body[map.expiry] = req.body.vehicle[map.expiry];
        req.body[map.expiry_time] = req.body.vehicle[map.expiry_time];
      }
    });

    // ✅ Handle log book document separately (if file uploaded directly)
    if (req.files && req.files.length > 0) {
      const logBookFile = req.files.find(
        (f) => f.fieldname === "log_book_document",
      );
      if (logBookFile) {
        if (!req.body.vehicle) req.body.vehicle = {};
        req.body.vehicle.log_book_document = `${BASE_URL}${logBookFile.filename}`;
      }
    }

    // --- Vehicle selection mutual exclusion logic ---
    if (req.body.use_company_vehicle) {
      if (req.body.company_vehicle_id) {
        req.body.vehicle = null;
        req.body.vehicle_id = null;
      }
    } else {
      if (req.body.vehicle && Object.keys(req.body.vehicle).length) {
        req.body.company_vehicle_id = null;
      }
    }

    // ✅ Update driver in DB
    const driverData = cleanEmptyToNull(req.body);
    await Driver.update(driverId, driverData);

    const updatedDriver = await Driver.getById(driverId);

    res.status(200).json({
      status: true,
      message: "Driver updated successfully",
      driver: updatedDriver,
    });
  } catch (err) {
    console.error("❌ Error updating driver:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};

//Delete Driver By ID
exports.delete = async (req, res) => {
  try {
    await Driver.delete(req.params.id);
    res.json({ status: true, message: "Driver deleted" });
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res
        .status(404)
        .json({ status: false, message: "Driver not found" });
    }
    res.status(500).json({ status: false, error: err.message });
  }
};

// GET DRIVERS BY COMPANY ID
exports.getByCompany = async (req, res) => {
  try {
    const { company_id } = req.params;

    if (!company_id) {
      return res.status(400).json({
        status: false,
        message: "company_id is required",
      });
    }

    const drivers = await Driver.getByCompany(company_id);

    return res.json({
      status: true,
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.driverLogin = async (req, res) => {
  const { username, password, fcm_token } = req.body;
  try {
    const driver = await Driver.findDriverByUsername(username);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    if (!driver.active) {
      return res.status(401).json({ message: "Your account is inactive" });
    }
    const passwordMatch = await bcrypt.compare(password, driver.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
    if (driver.session_status === "logged_in") {
      return res.status(400).json({ message: "Driver is already logged in" });
    }
    const token = jwt.sign({ driverId: driver.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    await Driver.updateDriverLoginStatus(driver.id);
    if (fcm_token) {
      await Driver.updateDriverFcmToken(driver.id, fcm_token);
    } // ONLY IMPORTANT FIX
    const updatedDriver = await Driver.getLoginDriverById(driver.id);
    const updatedDriverSocket = await Driver.getById(driver.id);
  
    notifyDriverLogin(updatedDriverSocket);
    return res.status(200).json({
      message: "Login successful",
      driverInfo: updatedDriver,
      token: token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "An error occurred during login" });
  }
};

exports.verifyDriverToken = async (req, res) => {
  try {
    const { id, driver_access_token } = req.body;
    console.log(
      "🚀 INCOMING DRIVER VERIFY TOKEN BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!id || !driver_access_token) {
      return res.status(400).json({
        status: false,
        message: "Driver_ID and Driver_Access_Token Are Required",
      });
    } // 1️⃣ Driver data fetch karna
    const query = `SELECT driver_access_token FROM drivers WHERE id = $1`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Driver not found" });
    }
    const storedToken = result.rows[0].driver_access_token;
    // 2️⃣ Null token check
    if (!storedToken) {
      return res
        .status(400)
        .json({ status: false, message: "Driver has no access token stored" });
    }
    // 3️⃣ Token comparison
    if (storedToken === driver_access_token) {
      return res
        .status(200)
        .json({ status: true, message: "Token verified successfully" });
    } else {
      return res.status(400).json({ status: false, message: "Invalid token" });
    }
  } catch (error) {
    console.error("Error verifying driver token:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// GET ALL DRIVER BY DRIVER TYPE
exports.getDriversByCommissionType = async (req, res) => {
  try {
    const { active, driver_type } = req.query;

    const data = await Driver.getAllDriverByCommissionType(active, driver_type);

    return res.status(200).json({
      status: true,
      message: "Drivers fetched successfully",
      total: data.total,
      drivers: data.drivers,
    });
  } catch (error) {
    console.error("❌ Error fetching commission drivers:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.getBySessionStatus = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      session_status, // 👈 new param
      username,
      name,
      mobile,
      mot_expiry,
      mot2_expiry,
      insurance_expiry,
      licence_expiry,
      driver_end_date,
      vehicle_end_date,
      vehicle_type,
      subsidiary,
      active = true,
    } = req.query;

    const { total, drivers } = await Driver.getBySessionStatus({
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      session_status,
      username,
      name,
      mobile,
      mot_expiry,
      mot2_expiry,
      insurance_expiry,
      licence_expiry,
      driver_end_date,
      vehicle_end_date,
      vehicle_type,
      subsidiary,
      active,
    });

    res.json({
      status: true,
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      total,
      total_pages: Math.ceil(total / limit),
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    console.error("Error fetching drivers by session:", err);
    res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.driverLogout = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "driverId is required" });
  }

  try {
    const driver = await Driver.getById(id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // DB update
    await Driver.updateDriverLogoutStatus(id);
    await Driver.clearDriverFcmToken(id);

    // REMOVE FROM WS LOGIN SOCKET
    notifyDriverLogout(Number(id));

    // REMOVE FROM SOCKET IO LOGIN SOCKET
    // notifyDriverLogout(Number(id), io);

    return res.status(200).json({
      status: true,
      message: "Logout successful",
      driverId: id,
      session_status: "logged_out",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      status: false,
      message: "An error occurred during logout",
    });
  }
};

exports.onBreakDriver = async (req, res) => {
  try {
    const { driver_id, on_break } = req.body;
    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "Driver ID is Required",
      });
    }
    if (!on_break) {
      return res.status(400).json({
        status: false,
        message: "on_break is Required",
      });
    }
    console.log(
      "🚀 INCOMING DRIVER ON BREAK BODY:",
      JSON.stringify(req.body, null, 2),
    );

    // const data = await Driver.getAllDriverByCommissionType(active, driver_type);
    if (on_break == true || on_break == "true") {
      console.log("DRIVER IS ON BREAK:", on_break);
      return res.status(200).json({
        status: true,
        message: "Driver Is On Break",
        driver_id: driver_id,
        on_break: true,
      });
    }
    if (on_break == false || on_break == "false") {
      console.log("DRIVER BREAK IS END:", on_break);
      return res.status(200).json({
        status: true,
        message: "Driver Break End",
        driver_id: driver_id,
        on_break: false,
      });
    }
    return res.status(400).json({
      status: false,
      message: "Invalid options",
    });
  } catch (error) {
    console.error("❌ Error fetching commission drivers:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.onPanicDriver = async (req, res) => {
  try {
    const { driver_id, panic } = req.body;
    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "Driver ID is Required",
      });
    }
    if (!panic) {
      return res.status(400).json({
        status: false,
        message: "panic is Required",
      });
    }
    console.log(
      "🚀 INCOMING DRIVER ON BREAK BODY:",
      JSON.stringify(req.body, null, 2),
    );

    // const data = await Driver.getAllDriverByCommissionType(active, driver_type);
    if (panic == true || panic == "true") {
      console.log("DRIVER PANIC BUTTON ACTIVE:", panic);
      return res.status(200).json({
        status: true,
        message: "Driver Enable Panic",
        driver_id: driver_id,
        panic: true,
      });
    }
    if (panic == false || panic == "false") {
      console.log("DRIVER PANIC BUTTON DISABLE:", panic);
      return res.status(200).json({
        status: true,
        message: "Driver Disable Panic",
        driver_id: driver_id,
        panic: false,
      });
    }
    return res.status(400).json({
      status: false,
      message: "Invalid options",
    });
  } catch (error) {
    console.error("❌ Error panic button:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
