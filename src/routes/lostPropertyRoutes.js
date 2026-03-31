const express = require("express");
const router = express.Router();
const controller = require("../controllers/lostPropertyController");

router.post("/lost_property", controller.create);
router.get("/lost_properties", controller.getAll);
router.get("/lost_property", controller.getById);
router.put("/lost_property/:id", controller.update);
router.delete("/lost_property/:id", controller.delete);

module.exports = router;