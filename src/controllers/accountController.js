const Account = require("../models/accountModel");

// CREATE
exports.createAccount = async (req, res) => {
  try {
    const account = await Account.createAccountWithRelations(req.body);
    console.log(
      "🚀 INCOMING ACCOUNT ADD BODY:",
      JSON.stringify(req.body, null, 2)
    );
    res.status(200).json({ status: true, account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

// Get All Accounts
exports.getAccounts = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 100,
      account_type,
      name,
      address,
      email,
      mobile,
      telephone,
      contact_name,
      subsidiary,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { accounts, total } = await Account.getAccounts({
      offset,
      limit,
      filters: {
        account_type,
        name,
        address,
        email,
        mobile,
        telephone,
        contact_name,
        subsidiary,
      },
    });

    res.json({
      status: true,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      count: accounts.length,
      accounts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

// READ: single account with relations
exports.getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({ status: false, message: "ID not found" });
    }
    const account = await Account.getAccountById(id);
    if (!account)
      return res
        .status(404)
        .json({ status: false, message: "Account not found" });
    res.json({ status: true, account: account });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

// ✅ UPDATE (Edit Account + Relations)
exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Account ID is required" });
    }
    console.log(
      "🚀 INCOMING ACCOUNT UPDATE BODY:",
      JSON.stringify(req.body, null, 2)
    );
    const account = await Account.updateAccountWithRelations(id, req.body);
    if (!account) {
      return res
        .status(404)
        .json({ status: false, message: "Account not found" });
    }

    res.json({ status: true, account });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};

// ✅ DELETE (Delete Account + Child relations)
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "ID not provided" });
    }

    const deletedAccount = await Account.deleteAccountWithRelations(id);

    if (!deletedAccount) {
      return res
        .status(404)
        .json({ status: false, message: "Account not found" });
    }

    res.json({ status: true, message: "Account Deleted Successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};
