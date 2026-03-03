const express = require("express");
const router = express.Router();
const controller = require("../controllers/driverCommissionController");

router.post("/add", controller.create);
router.get("/distinct", controller.getDistinct);
router.get("/driverid", controller.getByDriverId);
router.get("/getbyid/:id", controller.getById);
router.post("/update/:id", controller.update);
router.delete("/delete/:id", controller.delete);
module.exports = router;
