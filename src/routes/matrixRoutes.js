// routes/matrixRoutes.js
const express = require("express");
const router = express.Router();
const matrixController = require("../controllers/matrixController");

// GET API endpoint for driver/dispatch matrix
router.get("/availability", matrixController.fetchMatrixData);

module.exports = router;
