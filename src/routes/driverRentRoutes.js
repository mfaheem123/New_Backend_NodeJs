const express = require("express");
const router = express.Router();
const DriverRentController = require("../controllers/driverRentController");

router.post("/add", DriverRentController.create);
router.get("/distinct", DriverRentController.getDistinct);
router.get("/driverid", DriverRentController.getByDriverId);
router.get("/getbyid/:id", DriverRentController.getById);
router.post("/update/:id", DriverRentController.update);
router.delete("/delete/:id", DriverRentController.delete);
router.get("/bulk-preview", DriverRentController.getBulkPreview);
router.post("/bulk-create", DriverRentController.createBulk);

module.exports = router;
