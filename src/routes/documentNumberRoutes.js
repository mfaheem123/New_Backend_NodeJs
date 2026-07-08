const express = require("express");
const router = express.Router();
const controller = require("../controllers/documentNumberController");

router.post("/document_numbers/add", controller.create);
router.get("/document_numbers/get", controller.getAll);
router.get("/document_numbers/:id", controller.getById);
router.put("/document_numbers/:id", controller.update);
router.delete("/document_numbers/:id", controller.remove);

module.exports = router;
