// src/routes/roles.js
const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/rolesController");

router.get("/", rolesController.getAll);
router.get("/:id", rolesController.getById);
router.post("/", rolesController.create);
router.post("/:id", rolesController.update);
router.delete("/:id", rolesController.remove);

module.exports = router;
