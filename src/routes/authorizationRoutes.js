// routes/authorization.routes.js
const express = require("express");
const router = express.Router();
const authorizationController = require("../controllers/authorizationController");

router.post("/", authorizationController.create);
router.get("/role/:role_id", authorizationController.getByRole);
router.post("/update/:role_id", authorizationController.update);
router.delete("/:role_id", authorizationController.remove);

module.exports = router;
