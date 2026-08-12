const CompanySubscription = require("../models/companySubscriptionModel");
const companyWebSocket = require("../sockets/companyWebSocket");


const giveGracePeriod = async (req, res) => {

  try {

    const companyId = Number(req.params.companyId);

    const {
      days,
      reason
    } = req.body;

    const createdBy = req.user?.id || null;

    if (!companyId) {
      return res.status(400).json({
        status: false,
        message: "Company ID is required"
      });
    }

    if (!days || Number(days) <= 0) {
      return res.status(400).json({
        status: false,
        message: "Grace days must be greater than 0"
      });
    }

    const subscription =
      await CompanySubscription.getByCompanyId(companyId);

    if (!subscription) {
      return res.status(404).json({
        status: false,
        message: "Company subscription not found"
      });
    }

    const grace =
      await CompanySubscription.createGrace({
        subscriptionId: subscription.id,
        companyId,
        days: Number(days),
        reason,
        createdBy
      });

    // Tell frontend warning is temporarily disabled
    companyWebSocket.sendGraceStarted(
      companyId,
      grace.grace_until
    );

    return res.status(200).json({
      status: true,
      message: `Grace period granted for ${days} days`,
      grace
    });

  } catch (error) {

    console.error(
      "Give grace period error:",
      error
    );

    return res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};


const getSubscription = async (req, res) => {

  try {

    const companyId = Number(req.params.companyId);

    const subscription =
      await CompanySubscription.getByCompanyId(companyId);

    if (!subscription) {
      return res.status(404).json({
        status: false,
        message: "Subscription not found"
      });
    }

    return res.status(200).json({
      status: true,
      subscription
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};


module.exports = {
  giveGracePeriod,
  getSubscription
};