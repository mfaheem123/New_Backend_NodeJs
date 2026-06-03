const express = require("express");
const router = express.Router();
const companyConfigurationController = require("../controllers/companyConfigurationController");


router.post("/", companyConfigurationController.create);
router.get("/", companyConfigurationController.getAll);
router.get("/:id", companyConfigurationController.getById);
router.put("/:id", companyConfigurationController.update);
router.delete("/:id", companyConfigurationController.delete);