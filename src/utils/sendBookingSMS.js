//NEW CODE WITH DYNAMIC TEMPALTE

const { sendSMSWithTemplate } = require("../services/smsService");
const subsidiaryModel = require("../models/subsidiaryModel");
const { getCompanyIdByBookingId } = require("../models/bookingModel");

const buildViapointsStr = (viapoints) => {
  if (Array.isArray(viapoints)) {
    return viapoints.map((v) => ` via ${v.viapoint}`).join("");
  }
  if (typeof viapoints === "string" && viapoints.trim()) {
    return ` via ${viapoints}`;
  }
  return "";
};

const getMultiReservationDateRange = (clean) => {
  let multiRes = clean?.multi_reservation ?? clean?._multi_reservation;

  if (typeof multiRes === "string") {
    try {
      multiRes = JSON.parse(multiRes);
    } catch {
      multiRes = [];
    }
  }

const activeSlots = Array.isArray(multiRes)
    ? multiRes.filter((item) => item && !item.exclude && item.pickup_date)
    : [];

  if (activeSlots.length > 0) {
    return {
      from: activeSlots[0].pickup_date ?? "",
      to: activeSlots[activeSlots.length - 1].pickup_date ?? "",
    };
  }

  // Fallback agar single booking row mein multi_reservation array na ho
  const fallbackDate = clean?.pickup_date ?? "";
  return {
    from: fallbackDate,
    to: fallbackDate,
  };
};  

const sendDriverAssignedSMS = async (clean, companyId) => {
  if (!clean.driver_id) return;

  let subsidiaryEmail = "";
  if (clean.subsidiary_id) {
    const subsidiary = await subsidiaryModel.getById(clean.subsidiary_id);
    subsidiaryEmail = subsidiary?.email || "";
  }

  const template3Data = {
    company_name: clean.subsidiary?.name ?? "",
    company_telephone: clean.subsidiary?.telephone_number ?? "",
    company_email: subsidiaryEmail,
    vehicle_type: clean.vehicle_type?.name ?? "",
    vehicle_color: clean.driver?.vehicle?.color ?? "",
    vehicle_make: clean.driver?.vehicle?.make ?? "",
    vehicle_model: clean.driver?.vehicle?.model ?? "",
    vehicle_number: clean.driver?.vehicle?.vehicle_number ?? "",
    driver_name: clean.driver?.name ?? "",
  };

  await sendSMSWithTemplate({
    company_id: companyId,
    template_name: "Customer Dispatch", // ✅ Company ke mutabiq dynamic (e.g. 3 ya 28)
    mobile: clean.mobile,
    port: 5,
    data: template3Data,
  });
};

const sendBookingSMS = async (clean) => {
  try {
    if (!clean?.sms) return;

    let companyId = clean?.company_id || null;
    if (!companyId && clean?.id) {
      companyId = await getCompanyIdByBookingId(clean.id);
    }

    const totalFare = clean?.total_charges ?? "0.00";
    const isStatus1or2 =
      clean.booking_status_id === 1 || clean.booking_status_id === 2;
    const isType1 =
      clean.booking_type_id === 1 || clean.booking_type_id === "1";
    const isType2 =
      clean.booking_type_id === 2 || clean.booking_type_id === "2";

  // ✅ First & Last active pickup_date from multi_reservation
  const { from: fromDate, to: toDate } = getMultiReservationDateRange(clean);

    const baseBookingData = {
      pickup_door_number: clean.pickup_door_number
        ? `Door: ${clean.pickup_door_number}`
        : "",
      pickup: clean.pickup ?? "",
      viapoints: buildViapointsStr(clean?.viapoints),
      dropoff_door_number: clean.dropoff_door_number
        ? `Door: ${clean.dropoff_door_number}`
        : "",
      dropoff: clean.dropoff ?? "",
      from: fromDate,
      to: toDate,
      customer: clean.name ?? clean.customer?.name ?? "",
      date: clean.pickup_date ?? "",
      time: clean.pickup_time ?? "",
      fares: totalFare,
      total_fares: totalFare,
      company_name: clean.subsidiary?.name ?? "",
      company_telephone: clean.subsidiary?.telephone_number ?? "",
      reference_number: clean.reference_number ?? "",
    };

    // 1. Normal Booking (Status 1/2, Quotation = false, Type = 1)
    if (isStatus1or2 && clean.quotation === false && isType1) {
      console.log("Company ID for SMS Logging: ", companyId);
      await sendSMSWithTemplate({
        company_id: companyId,
        template_name: "Booking Confirmation SMS", // ✅ Company 1 -> 6, Company 3 -> 29
        mobile: clean.mobile,
        port: 5,
        data: baseBookingData,
      });

      await sendDriverAssignedSMS(clean, companyId);
    }

    // 2. Quotation Booking (Status 1/2, Quotation = true, Type = 1)
    if (isStatus1or2 && clean.quotation === true && isType1) {
      console.log("Company ID for SMS Logging: ", companyId);
      await sendSMSWithTemplate({
        company_id: companyId,
        template_name: "Booking Quotation SMS", // ✅ Company ke mutabiq dynamic
        mobile: clean.mobile,
        port: 5,
        data: baseBookingData,
      });

      await sendDriverAssignedSMS(clean, companyId);
    }

    // 3. Multi Booking (Status 1/2, Quotation = false, Type = 2)
    if (isStatus1or2 && clean.quotation === false && isType2) {
      console.log("Company ID for SMS Logging: ", companyId);
      await sendSMSWithTemplate({
        company_id: companyId,
        template_name: "MultiBooking Confirmation Message", // ✅ Company 1 -> 20, Company 3 -> 39
        mobile: clean.mobile,
        port: 5,
        data: baseBookingData,
      });

      await sendDriverAssignedSMS(clean, companyId);
    }

    // 4. Driver Arrived (Status = 6)
    if (clean.booking_status_id === 6 && clean.driver_id) {
      await sendSMSWithTemplate({
        company_id: companyId,
        template_name: "Normal Arrival", // ✅ Company 1 -> 4, Company 3 -> 25
        mobile: clean.mobile,
        port: 5,
        data: {
          vehicle_type: clean.vehicle_type_name ?? clean.vehicle_type?.name ?? "",
        },
      });
    }
  } catch (error) {
    console.error("❌ SMS Sending Error:", error);
  }
};

module.exports = { sendBookingSMS };