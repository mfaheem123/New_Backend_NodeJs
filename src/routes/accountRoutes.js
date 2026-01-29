const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");

router.post("/add", accountController.createAccount);
router.get("/get", accountController.getAccounts);
router.get("/getbyid/:id", accountController.getAccountById);
router.post("/edit/:id", accountController.updateAccount);
router.delete("/delete/:id", accountController.deleteAccount);
router.get(
  "/subsidiary/:subsidiary_id",
  accountController.getAccountsBySubsidiary,
);

module.exports = router;
