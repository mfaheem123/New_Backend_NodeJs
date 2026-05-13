const express = require("express");

const router = express.Router();

const controller = require("../controllers/driverShiftHistoryController");

// CREATE
router.post("/add", controller.createHistory);

// GET ALL
router.get("/get", controller.getHistories);

// GET SINGLE
router.get("/getbyid/:id", controller.getHistoryById);

// UPDATE
router.post("/update/:id", controller.updateHistory);

// DELETE
router.delete("/delete/:id", controller.deleteHistory);

// LOGIN HISTORY
router.get("/login", controller.getDriverLoginHistory);

module.exports = router;
