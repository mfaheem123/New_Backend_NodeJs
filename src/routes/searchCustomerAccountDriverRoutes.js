const express = require("express");
const router = express.Router();
const { searchContacts } = require("../controllers/searchCustomerAccountDriverController");

// GET /api/search?mobile=123&type=customer&company_id=3
// GET /api/search?email=test@mailinator.com&type=account&company_id=3
// GET /api/search?type=driver&company_id=3
router.get("/search", searchContacts);

module.exports = router;