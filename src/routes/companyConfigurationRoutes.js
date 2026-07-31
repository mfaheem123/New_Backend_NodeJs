const express = require("express");
const router = express.Router();
const companyConfigurationController = require("../controllers/companyConfigurationController");


router.post("/add", companyConfigurationController.create);
router.get("/get", companyConfigurationController.getAll);
router.get("/subsidiary_id/:subsidiary_id", companyConfigurationController.getById);
router.put("/:subsidiary_id", companyConfigurationController.update);
router.delete("/:subsidiary_id", companyConfigurationController.delete);


module.exports = router;
