// routes/authorization.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/authorizationController");

router.post("/", controller.create);
router.get("/role/:role_id", controller.getByRole);
router.post("/update/:role_id", controller.update);
router.delete("/:role_id", controller.remove);

module.exports = router;
