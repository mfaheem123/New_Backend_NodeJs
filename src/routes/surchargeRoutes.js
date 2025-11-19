const express = require("express");
const router = express.Router();
const Controller = require("../controllers/surchargeController");

router.post("/add", Controller.add);
router.post("/edit/:id", Controller.update);
router.delete("/delete/:id", Controller.delete);
router.get("/get", Controller.getAll);
router.get("/getbyid/:id", Controller.getOne);
router.post("/active/:id", Controller.updateActive);

module.exports = router;
