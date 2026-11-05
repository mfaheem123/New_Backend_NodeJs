const express = require('express');
const router = express.Router();
const driverCommissionPayController = require('../controllers/driverCommissionPayController');

// GET all ledgers (with optional filters: ?offset=0&limit=100&driver_id=136&invoice_type=commission)
router.get('/get-all-ledgers', driverCommissionPayController.getLedgers);

// GET single ledger by id
router.get('/get-ledger-by-id/:id', driverCommissionPayController.getLedgerById);

// POST create new ledger entry
router.post('/create-ledger', driverCommissionPayController.createLedger);

// PUT update ledger entry
router.post('/update-ledger/:id', driverCommissionPayController.updateLedger);

// DELETE ledger entry
router.delete('/delete-ledger/:id', driverCommissionPayController.deleteLedger);

module.exports = router;