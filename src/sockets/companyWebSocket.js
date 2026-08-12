const url = require("url");
const companySockets = new Map();
const CompanySubscription = require("../models/companySubscriptionModel");

// 🚀 Incoming WebSocket connection se company_id extract karke attach karein
function handleCompanySubscriptionSocket(ws, req) {
  const parsedUrl = url.parse(req.url, true);
  const companyId = parsedUrl.query.company_id;

  if (!companyId) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        message: "company_id is required as query parameter (e.g. ?company_id=1)"
      })
    );
    ws.close();
    return;
  }

  // Socket ko Company List mein add karein
  addCompanySocket(companyId, ws);
}

async function addCompanySocket(companyId, ws) {
  companyId = Number(companyId);

  if (!companySockets.has(companyId)) {
    companySockets.set(companyId, new Set());
  }

  companySockets.get(companyId).add(ws);
  ws.companyId = companyId;

  // 🚀 SOCKET CONNECT HOTE HI INSTANT WARNING CHECK
  try {
    const sub = await CompanySubscription.getByCompanyId(companyId);
    if (sub && sub.payment_status !== 'PAID') {
      const now = new Date();
      const expiryAt = new Date(sub.expiry_at);
      const graceUntil = sub.grace_until ? new Date(sub.grace_until) : null;

      // Agar Lock out stage par hai
      if ((graceUntil && now > graceUntil) || (!graceUntil && now > expiryAt)) {
        ws.send(JSON.stringify({
          event: "FORCE_LOGOUT",
          company_id: companyId,
          message: "Subscription expired. Access locked."
        }));
      } 
      // Agar Grace Period chal raha hai
      else if (graceUntil && now <= graceUntil) {
        const daysLeft = Math.ceil((graceUntil - now) / (1000 * 60 * 60 * 24));
        ws.send(JSON.stringify({
          event: "SUBSCRIPTION_GRACE_DAYS_LEFT",
          company_id: companyId,
          days_left: daysLeft,
          message: `Notice: You are in grace period. ${daysLeft} day(s) left.`
        }));
      } 
      // Agar Expiry se 3 din pehle wala time hai
      else if (now <= expiryAt) {
        const daysLeft = Math.ceil((expiryAt - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3) {
          ws.send(JSON.stringify({
            event: "SUBSCRIPTION_PRE_EXPIRY_WARNING",
            company_id: companyId,
            days_left: daysLeft,
            message: `Warning: Your subscription expires in ${daysLeft} day(s).`
          }));
        }
      }
    }
  } catch (err) {
    console.error("Error on socket initial subscription check:", err);
  }

  ws.on("close", () => {
    removeCompanySocket(companyId, ws);
  });
}


function removeCompanySocket(companyId, ws) {

  const sockets = companySockets.get(
    Number(companyId)
  );

  if (!sockets) {
    return;
  }

  sockets.delete(ws);

  if (sockets.size === 0) {
    companySockets.delete(
      Number(companyId)
    );
  }
}


function sendToCompany(companyId, payload) {

  const sockets = companySockets.get(
    Number(companyId)
  );

  if (!sockets) {
    return;
  }

  const message =
    JSON.stringify(payload);

  for (const ws of sockets) {

    if (ws.readyState === 1) {

      ws.send(message);

    }
  }
}


function sendSubscriptionWarning(
  companyId,
  data = {}
) {

  sendToCompany(
    companyId,
    {
      event: "SUBSCRIPTION_EXPIRY_WARNING",

      company_id: Number(companyId),

      ...data,

      timestamp: new Date().toISOString()
    }
  );
}


function sendGraceStarted(
  companyId,
  graceUntil
) {

  sendToCompany(
    companyId,
    {
      event: "SUBSCRIPTION_GRACE_STARTED",

      company_id: Number(companyId),

      grace_until: graceUntil,

      timestamp: new Date().toISOString()
    }
  );
}


// Force logout event
function sendForceLogout(companyId) {
  sendToCompany(companyId, {
    event: "FORCE_LOGOUT",
    company_id: Number(companyId),
    reason: "SUBSCRIPTION_EXPIRED_AND_LOCKED",
    message: "Your subscription and grace period have ended. Access locked.",
    timestamp: new Date().toISOString()
  });
}

// Pre-expiry warning (Expiry se 2-3 din pehle)
function sendPreExpiryWarning(companyId, daysLeft) {
  sendToCompany(companyId, {
    event: "SUBSCRIPTION_PRE_EXPIRY_WARNING",
    company_id: Number(companyId),
    days_left: Number(daysLeft),
    message: `Warning: Your subscription will expire in ${daysLeft} day(s). Please make payment to avoid account lock.`,
    timestamp: new Date().toISOString()
  });
}

// Grace period warning (Extra days mein roz kitne din bache hain)
function sendGraceDaysLeftWarning(companyId, daysLeft) {
  sendToCompany(companyId, {
    event: "SUBSCRIPTION_GRACE_DAYS_LEFT",
    company_id: Number(companyId),
    days_left: Number(daysLeft),
    message: `Notice: You are in grace period. ${daysLeft} day(s) left before total lockout.`,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  addCompanySocket,
  removeCompanySocket,
  sendToCompany,
  sendSubscriptionWarning,
  sendGraceStarted,
  sendForceLogout,
  sendPreExpiryWarning,
  sendGraceDaysLeftWarning,
  handleCompanySubscriptionSocket // <-- ADD THIS EXPORT
};