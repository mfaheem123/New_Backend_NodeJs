const express = require("express");
const router = express.Router();
const controller = require("../controllers/lostPropertyController");

router.post("/add", controller.create);
router.get("/get", controller.getAll);
router.get("/getbyid/:id", controller.getById);
router.post("/update/:id", controller.update);
router.delete("/delete/:id", controller.delete);

module.exports = router;
