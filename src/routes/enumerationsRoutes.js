const express = require("express");
const router = express.Router();
const enumerationsController = require("../controllers/enumerationsController");

router.get("/get", enumerationsController.getAllEnumerations);
router.get("/payment-types", enumerationsController.getAllPaymentTypes);
router.post("/payment-types/update/:id", enumerationsController.updatePaymentType);

module.exports = router;
