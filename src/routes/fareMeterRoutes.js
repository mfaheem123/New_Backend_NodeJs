const express = require("express");
const router = express.Router();
const FareMeterController = require("../controllers/fareMeterController");

router.get("/get", FareMeterController.getAll);
router.get("/getbyid/:id", FareMeterController.getById);
router.post("/add", FareMeterController.create);
router.post("/edit/:id", FareMeterController.update);
router.delete("/delete/:id", FareMeterController.delete);

module.exports = router;
