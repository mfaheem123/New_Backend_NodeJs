const express = require("express");

const router = express.Router();

const controller = require("../controllers/driverShiftHistoryController");


// CREATE
router.post("/", controller.createHistory);


// GET ALL
router.get("/", controller.getHistories);


// GET SINGLE
router.get("/:id", controller.getHistoryById);


// UPDATE
router.put("/:id", controller.updateHistory);


// DELETE
router.delete("/:id", controller.deleteHistory);


module.exports = router;