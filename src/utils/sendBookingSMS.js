const { sendSMSWithTemplate } = require("../services/smsService");

const sendBookingSMS = async (clean) => {
  try {
    if (!clean?.sms) return;

    // const viapointsStr = clean?.viapoints?.length
    //   ? clean.viapoints.map((v) => ` via ${v}`).join("")
    //   : "";

    const totalFare = clean?.total_charges ?? "0.00";

    // ------------------------------------------------
    // BOOKING STATUS = 1
    // ------------------------------------------------
    if (clean.booking_status_id === 1) {
      let viapointsStr = "";

      if (Array.isArray(clean?.viapoints)) {
        viapointsStr = clean.viapoints
          .map((v) => ` via ${v.viapoint}`)
          .join("");
      } else if (typeof clean?.viapoints === "string") {
        viapointsStr = ` via ${clean.viapoints}`;
      }

      // TEMPLATE 6 (ALWAYS WHEN STATUS 1)
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
        customer: clean.name ?? clean.customer?.name ?? "",
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
        port: 5,
        data: template6Data,
      });

      // TEMPLATE 3 (ONLY IF DRIVER EXISTS)
      if (clean.driver_id) {
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
          port: 5,
          data: template3Data,
        });
      }
    }

    // ------------------------------------------------
    // BOOKING STATUS = 6 (DRIVER ARRIVED)
    // ------------------------------------------------
    if (clean.booking_status_id === 6 && clean.driver_id) {
      const template4Data = {
        // vehicle_type: clean.vehicle_type?.name ?? "",
        vehicle_type: clean.vehicle_type_name ?? "",
      };

      await sendSMSWithTemplate({
        template_id: 4,
        mobile: clean.mobile,
        port: 5,
        data: template4Data,
      });
    }
  } catch (error) {
    console.error("❌ SMS Sending Error:", error);
  }
};

module.exports = { sendBookingSMS };
