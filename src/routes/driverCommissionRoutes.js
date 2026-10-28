const express = require("express");
const router = express.Router();
const DriverCommissionController = require("../controllers/driverCommissionController");

router.post("/add", DriverCommissionController.create);
router.get("/distinct", DriverCommissionController.getDistinct);
router.get("/driverid", DriverCommissionController.getByDriverId);
router.get("/getbyid/:id", DriverCommissionController.getById);
router.post("/update/:id", DriverCommissionController.update);
router.delete("/delete/:id", DriverCommissionController.delete);
router.get("/bulk-preview", DriverCommissionController.getBulkPreview);
router.post("/bulk-create", DriverCommissionController.createBulk);

module.exports = router;
