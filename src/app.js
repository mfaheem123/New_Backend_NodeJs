const express = require('express');
const morgan = require('morgan');
const logger = require('./utils/logger');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer();

// Routes
const addressRoutes = require("./routes/addressRoutes");
const locationRoutes = require("./routes/locationRoutes");
const locationTypeRoutes = require("./routes/locationTypeRoutes");
const subsidiariesRoutes = require('./routes/subsidiaryRoutes');
const roleRoutes = require('./routes/roleRoutes');
const employeeRoutes = require('./routes/employeesRoutes');
const zoneRoutes = require("./routes/zoneRoutes");
const localizationRoutes = require('./routes/localizationRoutes');
const searchRoutes = require("./routes/searchRoutes");
const vehicleTypeRoutes = require("./routes/vehicleTypeRoutes");
const locationTypeZoneRoutes = require("./routes/locationType-ZoneRoutes");
const companyVehicleRoutes = require('./routes/companyVehicleRoutes');
const accountRoutes = require('./routes/accountRoutes');
const escortRoutes = require('./routes/escortRoutes');
const driverRoutes = require('./routes/driverRoutes');
const customerRoutes = require('./routes/customerRoutes');
const getVehicleAndCompanyDataRoutes = require("./routes/getVehicleAndCompanyDataRoutes");
const fareConfigurationRoutes = require("./routes/fareConfigurationRoutes");
const { loadLocationTypes } = require("./utils/locationTypeCache");
const combinedRoutes = require("./routes/combinedVehicleTypeAccountRoutes");
const combinedVehicleLocationTypesRoutes = require("./routes/combinedFixedFareListRoutes");
const fixedFareRoutes = require("./routes/fixedFareRoutes");
const combinedZonesVehicleTypesRoutes = require("./routes/combinedPlotFareListRoutes");
const plotFareRoutes = require("./routes/plotFareRoutes");
const fareByVehicleRoutes = require("./routes/fareByVehicleRoutes");
const airportRoutes = require("./routes/airportRoutes");
const fareIncrementRoutes = require("./routes/fareIncrementRoutes");

const app = express();

// ✅ CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Serve uploads folder publicly
// app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
console.log('Serving uploads from:', path.join(__dirname, '..', 'uploads'));



// ✅ Increase JSON and URL-encoded body size limits (Fixes "PayloadTooLargeError")
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ Load cached location types at startup
loadLocationTypes();

// ✅ Allow form-data for all routes EXCEPT those that handle file uploads
const skipFileUploadRoutes = [
  '/api/vehicle-type',
  '/api/company-vehicles',
  '/api/escorts',
  '/api/subsidiaries',
  '/api/drivers',
  '/api/faresconfiguration',
];
app.use((req, res, next) => {
  if (skipFileUploadRoutes.some((r) => req.originalUrl.startsWith(r))) {
    return next(); // let multer handle it later
  }
  upload.none()(req, res, next); // parse non-file form-data
});

// ✅ Logging
app.use(morgan(':method :url :status :response-time ms', { stream: logger.stream }));

// ✅ API Routes
app.use("/api/addresses", addressRoutes);
app.use("/api/location-types", locationTypeRoutes);
app.use("/api/locations", locationRoutes);
app.use('/api/subsidiaries', subsidiariesRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/employees', employeeRoutes);
app.use("/api/zones", zoneRoutes);
app.use('/api/localizations', localizationRoutes);
app.use("/api/services", searchRoutes);
app.use("/api/vehicle-type", vehicleTypeRoutes);
app.use("/api/locationtype", locationTypeZoneRoutes);
app.use('/api/company-vehicles', companyVehicleRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/escorts', escortRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/driver-combine', getVehicleAndCompanyDataRoutes);
app.use('/api/faresconfiguration', fareConfigurationRoutes);
app.use("/api/combined", combinedRoutes);
app.use("/api/fixedfares", fixedFareRoutes);
app.use("/api/combined",combinedVehicleLocationTypesRoutes);
app.use("/api/plotfares", plotFareRoutes);
app.use("/api/combined",combinedZonesVehicleTypesRoutes);
app.use("/api/farebyvehicle", fareByVehicleRoutes);
app.use("/api/airports", airportRoutes);
app.use("/api/fareincrement", fareIncrementRoutes);

// ✅ Print all routes in console (for debugging)
function printRoutes(stack, prefix = "") {
  stack.forEach((r) => {
    if (r.route && r.route.path) {
      const methods = Object.keys(r.route.methods).join(", ").toUpperCase();
      console.log(`${methods} ${prefix}${r.route.path}`);
    } else if (r.name === "router" && r.handle.stack) {
      printRoutes(r.handle.stack, prefix + (r.regexp.source.replace("^\\", "").replace("\\/?(?=\\/|$)", "")));
    }
  });
}
printRoutes(app._router.stack);

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    logger.error({
      message: "Request payload too large",
      route: req.originalUrl,
      method: req.method,
      status: 413,
    });
    return res.status(413).json({ error: "Request payload too large" });
  }

  logger.error({
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
    status: err.status || 500,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
