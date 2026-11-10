const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');

// Route: GET /api/audits?booking_id=4670
router.get('/audits', AuditController.getAudits);

module.exports = router;