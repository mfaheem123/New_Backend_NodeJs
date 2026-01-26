const express = require("express");
const router = express.Router();
const controller = require("../controllers/fareByVehicleController");

router.get("/get", controller.getAll);
router.get("/getbyid/:id", controller.getById);
router.post("/add", controller.create);
router.post("/update/:id", controller.update);
router.delete("/delete/:id", controller.remove);

module.exports = router;
