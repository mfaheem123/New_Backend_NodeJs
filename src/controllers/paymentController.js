const Stripe = require("stripe");
const CompanyConfig = require("../models/companyConfigurationModel");
const BookingModel = require("../models/bookingModel");
// Apne existing notification/socket helpers import karein:
const { sendPaymentDoneNotification } = require("../services/notificationService");
;

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
// 1. CREATE STRIPE CHECKOUT SESSION (/service/pay)
// ---------------------------------------------------------
exports.createServicePayment = async (req, res) => {
  try {
    const {
      booking_id,
      email,
      fare,
      mobile,
      company_id,
      subsidiary_id,
      currency = "gbp",
    } = req.body;

    const companyId = Number(company_id);
    const bookingId = booking_id ? Number(booking_id) : null;
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

    // Customer find ya create karein
    let stripeCustomerId = null;
    if (email) {
      const existingCustomers = await stripe.customers.list({
        email: email.trim(),
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: email.trim(),
          phone: mobile ? String(mobile).trim() : undefined,
          metadata: {
            company_id: String(companyId),
            subsidiary_id: subsidiary_id ? String(subsidiary_id) : "",
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    // Agar booking_id aayi hai to pehle hi stripe_customer_id link kar dein
    if (bookingId && stripeCustomerId) {
      await BookingModel.attachStripeCustomer(bookingId, companyId, stripeCustomerId);
    }

    const unitAmount = Math.round(numericFare * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      managed_payments: { enabled: false },
      allowed_payment_method_types: ["card"],
      customer: stripeCustomerId || undefined,
      customer_email: !stripeCustomerId && email ? email.trim() : undefined,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: bookingId ? `Booking #${bookingId} Fare` : "Service Booking Fare",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      // PaymentIntent mein bhi metadata pass karein
      payment_intent_data: {
        metadata: {
          company_id: String(companyId),
          subsidiary_id: subsidiary_id ? String(subsidiary_id) : "",
          booking_id: bookingId ? String(bookingId) : "",
        },
      },
      metadata: {
        company_id: String(companyId),
        subsidiary_id: subsidiary_id ? String(subsidiary_id) : "",
        booking_id: bookingId ? String(bookingId) : "",
        mobile: mobile ? String(mobile) : "",
      },
      success_url: "https://nexustechgroupz.co.uk/",
      cancel_url: "https://nexustechgroupz.co.uk/",
    //   success_url: "https://www.mycabify.co.uk/payment-success?session_id={CHECKOUT_SESSION_ID}",
    //   cancel_url: "https://www.mycabify.co.uk/payment-cancel",
    });

    return res.status(200).json({
      status: true,
      url: session.url,
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

    // Signature verify (req.body yahan raw Buffer hona chahiye)
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, config.endpoint_key.trim());
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Sirf tab proceed karein jab payment actually 'paid' ho
      if (session.payment_status === "paid") {
        const bookingId = Number(session.metadata?.booking_id);
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
        const stripePaymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;

        if (bookingId) {
          // Apne booking_statuses table ka exact 'Paid/Confirmed' ID yahan pass karein (maslan 2)
          const PAID_BOOKING_STATUS_ID = 2;

          const updatedBooking = await BookingModel.markBookingAsPaid({
  bookingId,
  companyId,
  stripeCustomerId,
  stripePaymentId,
});

          // Post-commit side effects: DB update hone ke baad driver ko notify karein
          if (updatedBooking && updatedBooking.driver_id) {
            const payload = {
              type: "BOOKING_PAYMENT_RECEIVED",
              booking_id: updatedBooking.id,
              reference_number: updatedBooking.reference_number,
              driver_id: updatedBooking.driver_id,
              amount: updatedBooking.total_charges || updatedBooking.fares,
              stripe_customer_id: updatedBooking.stripe_customer_id,
              stripe_payment_id: updatedBooking.stripe_payment_id,
              message: `Payment received for Booking #${updatedBooking.reference_number || updatedBooking.id}`,
            };

            await Promise.allSettled([
              // 1. Firebase FCM Push Notification to Driver
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



