const Stripe = require("stripe");
const CompanyConfig = require("../models/companyConfigurationModel");
const BookingModel = require("../models/bookingModel");
const { sendPaymentDoneNotification } = require("../services/notificationService");

const stripeClientCache = new Map();

function getStripeInstance(secretKey) {
  if (!secretKey || !secretKey.trim()) {
    throw new Error("Stripe secret key is not configured for this company.");
  }
  const key = secretKey.trim();
  if (!stripeClientCache.has(key)) {
    stripeClientCache.set(key, new Stripe(key));
  }
  return stripeClientCache.get(key);
}

// ---------------------------------------------------------
// 1. CREATE STRIPE CHECKOUT SESSION (Booking create hone se PEHLE)
// ---------------------------------------------------------
exports.createServicePayment = async (req, res) => {
  try {
    const {
      email,
      fare,
      mobile,
      company_id,
      subsidiary_id,
      currency = "gbp",
      tax_code = "txcd_20030000",
    } = req.body;

    const companyId = Number(company_id);
    const subsidiaryId = subsidiary_id ? Number(subsidiary_id) : null;
    const numericFare = Number(fare);

    if (!companyId || Number.isNaN(companyId)) {
      return res.status(400).json({ status: false, message: "Valid company_id is required." });
    }
    if (!numericFare || Number.isNaN(numericFare) || numericFare <= 0) {
      return res.status(400).json({ status: false, message: "Valid fare amount is required." });
    }

    const config = await CompanyConfig.getStripeConfigByCompanyId(companyId);
    if (!config || !config.stripe_secret_key) {
      return res.status(404).json({ status: false, message: "Stripe configuration not found." });
    }

    const stripe = getStripeInstance(config.stripe_secret_key);

    let stripeCustomerId = null;
    if (email && String(email).trim()) {
      const cleanEmail = String(email).trim();
      const existingCustomers = await stripe.customers.list({
        email: cleanEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: cleanEmail,
          phone: mobile ? String(mobile).trim() : undefined,
          metadata: {
            company_id: String(companyId),
            subsidiary_id: subsidiaryId ? String(subsidiaryId) : "",
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    const unitAmount = Math.round(numericFare * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer: stripeCustomerId || undefined,
      customer_email: !stripeCustomerId && email ? String(email).trim() : undefined,
      line_items: [
        {
          price_data: {
            currency: String(currency).toLowerCase(),
            product_data: {
              name: "Service Booking Fare",
              tax_code: String(tax_code).trim(),
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          company_id: String(companyId),
          subsidiary_id: subsidiaryId ? String(subsidiaryId) : "",
        },
      },
      metadata: {
        company_id: String(companyId),
        subsidiary_id: subsidiaryId ? String(subsidiaryId) : "",
        mobile: mobile ? String(mobile).trim() : "",
      },
      success_url: "https://nexustechgroupz.co.uk/",
      cancel_url: "https://nexustechgroupz.co.uk/",
    });

    return res.status(200).json({
      status: true,
      url: session.url,
      checkout_session_id: session.id,
      stripe_customer_id: stripeCustomerId,
      payment_intent: session.payment_intent || null,
    });
  } catch (error) {
    console.error("Stripe createServicePayment error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to create Stripe payment session.",
    });
  }
};

// ---------------------------------------------------------
// 2. STRIPE WEBHOOK (/webhook/stripe/:companyId)
// ---------------------------------------------------------
exports.handleStripeWebhook = async (req, res) => {
  const companyId = Number(req.params.companyId);
  const signature = req.headers["stripe-signature"];

  if (!companyId || Number.isNaN(companyId)) {
    return res.status(400).json({ status: false, message: "Invalid companyId in webhook URL." });
  }

  try {
    const config = await CompanyConfig.getStripeConfigByCompanyId(companyId);
    if (!config || !config.stripe_secret_key || !config.endpoint_key) {
      return res.status(404).json({
        status: false,
        message: "Stripe secret key or webhook endpoint_key missing for company.",
      });
    }

    const stripe = getStripeInstance(config.stripe_secret_key);

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, config.endpoint_key.trim());
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status === "paid") {
        const bookingId = Number(session.metadata?.booking_id);
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || null;
        const stripePaymentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.id;

        if (bookingId) {
          const updatedBooking = await BookingModel.markBookingAsPaid({
            bookingId,
            companyId,
            stripeCustomerId,
            stripePaymentId,
            paidPaymentTypeId: 4, // "credit card paid"
          });

          if (updatedBooking && updatedBooking.driver_id) {
            const payload = {
              type: "BOOKING_PAYMENT_RECEIVED",
              booking_id: updatedBooking.id,
              reference_number: updatedBooking.reference_number,
              driver_id: updatedBooking.driver_id,
              amount: updatedBooking.total_charges || updatedBooking.fares,
              payment_type_id: updatedBooking.payment_type_id,
              stripe_customer_id: updatedBooking.stripe_customer_id,
              stripe_payment_id: updatedBooking.stripe_payment_id,
              message: `Payment received for Booking #${updatedBooking.reference_number || updatedBooking.id}`,
            };

            await Promise.allSettled([
              sendPaymentDoneNotification(updatedBooking.driver_id, payload),
            ]);
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return res.status(500).json({ status: false, message: "Internal webhook error" });
  }
};
