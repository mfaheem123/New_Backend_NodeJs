// routes/matrixRoutes.js
const express = require("express");
const router = express.Router();
const MatrixController = require("../controllers/matrixController");

// GET API endpoint for driver/dispatch matrix
router.get("/zone-availability-matrix", MatrixController.fetchMatrixData);

module.exports = router;
