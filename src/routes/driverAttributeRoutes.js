const express = require("express");
const router = express.Router();
const controller = require("../controllers/driverAttributeController");

router.get("/get", controller.getAllAttributes);
router.get("/getbyid/:id", controller.getAttributeById);
router.post("/add", controller.addAttribute);
router.put("/update/:id", controller.updateAttribute);
router.delete("/delete/:id", controller.deleteAttribute);

module.exports = router;
