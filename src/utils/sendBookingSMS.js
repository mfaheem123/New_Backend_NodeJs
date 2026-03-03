const { sendSMSWithTemplate } = require("../services/smsService");

const sendBookingSMS = async (clean) => {
  try {
    if (!clean?.sms) return;
    if (clean?.booking_status_id !== 1) return;

    const viapointsStr = clean?.viapoints?.length
      ? clean.viapoints.map(v => ` via ${v}`).join("")
      : "";

    const totalFare = clean?.total_charges ?? "0.00";

    // -------------------------
    // TEMPLATE 3 DATA
    // -------------------------
    const template3Data = {
      company_name: clean.subsidiary?.name ?? "",
      company_telephone: clean.subsidiary?.telephone_number ?? "",
      company_email: clean.subsidiary?.email ?? "",
      vehicle_type: clean.vehicle_type?.name ?? "",
      vehicle_color: clean.driver?.vehicle?.color ?? "",
      vehicle_make: clean.driver?.vehicle?.make ?? "",
      vehicle_model: clean.driver?.vehicle?.model ?? "",
      vehicle_number: clean.driver?.vehicle?.vehicle_number ?? "",
      driver_name: clean.driver?.name ?? "",
      fares: totalFare,
    };

    await sendSMSWithTemplate({
      template_id: 3,
      mobile: clean.mobile,
      port: 1,
      data: template3Data,
    });

    // -------------------------
    // TEMPLATE 6 DATA
    // -------------------------
    const template6Data = {
      pickup_door_number: clean.pickup_door_number
        ? `Door: ${clean.pickup_door_number}`
        : "",
      pickup: clean.pickup ?? "",
      viapoints: viapointsStr,
      dropoff_door_number: clean.dropoff_door_number
        ? `Door: ${clean.dropoff_door_number}`
        : "",
      dropoff: clean.dropoff ?? "",
      customer: clean.customer_name ?? clean.customer?.name ?? "",
      date: clean.pickup_date ?? "",
      time: clean.pickup_time ?? "",
      fares: totalFare,
      total_fares: totalFare,
      company_name: clean.subsidiary?.name ?? "",
      company_telephone: clean.subsidiary?.telephone_number ?? "",
    };

    await sendSMSWithTemplate({
      template_id: 6,
      mobile: clean.mobile,
      port: 1,
      data: template6Data,
    });

    // -------------------------
    // TEMPLATE 2 (ONLY IF DRIVER EXISTS)
    // -------------------------
    if (clean.driver_id) {
      const template2Data = {
        payment_type: clean.payment_type?.name ?? "",
        reference_number: clean.reference_number ?? "",
        customer: clean.customer_name ?? clean.customer?.name ?? "",
        customer_mobile: clean.mobile ?? clean.customer?.mobile ?? "",
        customer_telephone: clean.telephone ?? clean.customer?.telephone ?? "",
        pickup_door_number: clean.pickup_door_number
          ? `Door: ${clean.pickup_door_number}`
          : "",
        pickup: clean.pickup ?? "",
        viapoints: viapointsStr,
        dropoff_door_number: clean.dropoff_door_number
          ? `Door: ${clean.dropoff_door_number}`
          : "",
        dropoff: clean.dropoff ?? "",
        flight_number: clean.flight_number
          ? `Flight: ${clean.flight_number}`
          : "",
        arriving_from: clean.arriving_from
          ? `Arriving from: ${clean.arriving_from}`
          : "",
        date: clean.pickup_date ?? "",
        time: clean.pickup_time ?? "",
        fares: totalFare,
        vehicle_type: clean.vehicle_type?.name ?? "",
        special_instructions: clean.special_instructions ?? "",
        company_name: clean.subsidiary?.name ?? "",
        VIAPOINTS: viapointsStr,
      };

      await sendSMSWithTemplate({
        template_id: 2,
        mobile: clean.mobile,
        port: 1,
        data: template2Data,
      });
    }

  } catch (error) {
    console.error("❌ SMS Sending Error:", error);
  }
};

module.exports = { sendBookingSMS };