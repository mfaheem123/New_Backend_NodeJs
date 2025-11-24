const express = require("express");
const router = express.Router();

const EmployeeExtCtrl = require("../controllers/employeeExtensionsController");

router.post("/add", EmployeeExtCtrl.add);
router.get("/getbyid/:id", EmployeeExtCtrl.getById);
router.get("/get", EmployeeExtCtrl.get);
router.post("/update/:id", EmployeeExtCtrl.update);
router.delete("/delete/:id", EmployeeExtCtrl.delete);

module.exports = router;
