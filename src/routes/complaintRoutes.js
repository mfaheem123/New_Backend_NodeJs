const router = require("express").Router();

const controller = require("../controllers/complaintController");

router.post("/add", controller.create);

router.get("/get", controller.getAll);

router.get("/getbyid", controller.getById);

router.post("/update/:id", controller.update);

router.delete("/delete/:id", controller.delete);

module.exports = router;
