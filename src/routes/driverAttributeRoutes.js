const express = require("express");
const router = express.Router();
const driverAttributeController = require("../controllers/driverAttributeController");

router.get("/get", driverAttributeController.getAllAttributes);
router.get("/getbyid/:id", driverAttributeController.getAttributeById);
router.post("/add", driverAttributeController.addAttribute);
router.post("/update/:id", driverAttributeController.updateAttribute);
router.delete("/delete/:id", driverAttributeController.deleteAttribute);

module.exports = router;
