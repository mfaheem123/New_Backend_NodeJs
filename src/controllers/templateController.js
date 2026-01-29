const TemplateModel = require("../models/templateModel");

const TemplateController = {
  getTemplateTypes: async (req, res) => {
    try {
      const templateTypes = await TemplateModel.getAllTemplateTypes();
      return res.json({
        status: true,
        template_types: templateTypes,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  getTemplatesByType: async (req, res) => {
    try {
      const { template_type_id } = req.query;

      if (!template_type_id) {
        return res.status(400).json({
          status: false,
          message: "template_type_id is required",
        });
      }

      const templates =
        await TemplateModel.getTemplatesByTypeId(template_type_id);

      return res.json({
        status: true,
        templates,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  getTemplate: async (req, res) => {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          status: false,
          message: "Template ID is required",
        });
      }

      const template = await TemplateModel.getTemplateById(id);

      if (!template) {
        return res.status(404).json({
          status: false,
          message: "Template not found",
        });
      }

      return res.json({
        status: true,
        templates: {
          id: template.id,
          template_type_id: template.template_type_id,
          name: template.name,
          subject: template.subject,
          content: template.content,
          body: template.body,
          template_type: {
            id: template.template_type_id,
            name: template.template_type_name,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  getAllTemplates: async (req, res) => {
    try {
      const templates = await TemplateModel.getAllTemplates();
      return res.json({
        status: true,
        templates,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  createTemplate: async (req, res) => {
    try {
      const { template_type_id, name, subject, content, body } = req.body;

      if (!template_type_id || !name || !content) {
        return res.status(400).json({
          status: false,
          message: "template_type_id, name, and content are required",
        });
      }

      const template = await TemplateModel.createTemplate({
        template_type_id,
        name,
        subject,
        content,
        body,
      });

      return res.status(200).json({
        status: true,
        message: "Template created successfully",
        template,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const { template_type_id, name, subject, content, body } = req.body;

      if (!id) {
        return res.status(400).json({
          status: false,
          message: "Template ID is required",
        });
      }

      const existingTemplate = await TemplateModel.getTemplateById(id);
      if (!existingTemplate) {
        return res.status(404).json({
          status: false,
          message: "Template not found",
        });
      }

      const template = await TemplateModel.updateTemplate(id, {
        template_type_id: template_type_id || existingTemplate.template_type_id,
        name: name || existingTemplate.name,
        subject: subject !== undefined ? subject : existingTemplate.subject,
        content: content || existingTemplate.content,
        body: body !== undefined ? body : existingTemplate.body,
      });

      return res.json({
        status: true,
        message: "Template updated successfully",
        template,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: false,
          message: "Template ID is required",
        });
      }

      const existingTemplate = await TemplateModel.getTemplateById(id);
      if (!existingTemplate) {
        return res.status(404).json({
          status: false,
          message: "Template not found",
        });
      }

      await TemplateModel.deleteTemplate(id);

      return res.json({
        status: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },
};

module.exports = TemplateController;
