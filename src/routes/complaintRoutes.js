const router = require("express").Router();

const complaintController = require("../controllers/complaintController");

router.post("/add", complaintController.create);

router.get("/get", complaintController.getAll);

router.get("/getbyid", complaintController.getById);

router.post("/update/:id", complaintController.update);

router.delete("/delete/:id", complaintController.delete);

module.exports = router;
