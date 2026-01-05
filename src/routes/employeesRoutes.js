const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const employeesController = require("../controllers/employeesController");

// Create uploads folder if not exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

router.get("/get", employeesController.getAll);
router.get("/getbyid/:id", employeesController.getById);
router.post("/add", upload.single("image"), employeesController.create);
router.post("/edit/:id", employeesController.update);
router.delete("/delete/:id", employeesController.remove);
router.post("/login", employeesController.login);
module.exports = router;
