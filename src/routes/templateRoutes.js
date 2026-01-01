const express = require("express");
const router = express.Router();
const TemplateController = require("../controllers/templateController");

// Get all template types
router.get("/template_types", TemplateController.getTemplateTypes);

// Get templates by type
router.get("/get_templates_by_types", TemplateController.getTemplatesByType);

// Get specific template by ID (your API endpoint)
router.get("/template_setting", TemplateController.getTemplate);

// Get all templates
router.get("/templates", TemplateController.getAllTemplates);

// Create new template
router.post("/templates", TemplateController.createTemplate);

// Update template
router.post("/edit_templates/:id", TemplateController.updateTemplate);

// Delete template
router.delete("/templates/:id", TemplateController.deleteTemplate);

module.exports = router;
