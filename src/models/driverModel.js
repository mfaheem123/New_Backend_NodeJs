const db = require("../db");
const bcrypt = require("bcrypt");

// 🧰 Helper: Format date as DD-MM-YYYY
function formatDateOnly(date) {
  if (!date) return null;
  const d = new Date(date);

  // Handle string dates gracefully (avoid timezone shift)
  if (typeof date === "string" && date.match(/^\d{2}-\d{2}-\d{4}$/))
    return date;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

// 🧰 Normalize driver and nested vehicle dates
function normalizeDriverDates(driver) {
  if (!driver) return driver;

  const dateKeys = [
    "dob",
    "start_date",
    "end_date",
    "licence_expiry",
    "phc_driver_expiry",
    "insurance_expiry",
    "rental_agreement_expiry",
    "road_tax_expiry",
    "v5_registration_expiry",
    "mot_expiry",
    "mot2_expiry",
    "phc_vehicle_expiry",
  ];

  for (const k of dateKeys) {
    if (driver[k]) driver[k] = formatDateOnly(driver[k]);
  }

  if (driver.vehicle) {
    const vKeys = [
      "start_date",
      "end_date",
      "mot_expiry",
      "mot2_expiry",
      "insurance_expiry",
      "phc_vehicle_expiry",
    ];
    for (const k of vKeys) {
      if (driver.vehicle[k])
        driver.vehicle[k] = formatDateOnly(driver.vehicle[k]);
    }
  }

  return driver;
}

function formatVehicle(v) {
  if (!v) return null;

  return {
    id: v.id,
    vehicle_type_id: v.vehicle_type_id,
    vehicle_number: v.vehicle_number,
    make: v.make,
    model: v.model,
    color: v.color,
    owner: v.owner,
    start_date: v.start_date,
    end_date: v.end_date,
    company: v.company,
    assigned: v.assigned,

    log_book: {
      log_book_number: v.log_book_number,
      log_book_document: v.log_book_document,
    },
    mot: {
      mot_number: v.mot_number,
      mot_expiry: v.mot_expiry,
      mot_expiry_time: v.mot_expiry_time,
      mot_document: v.mot_document,
    },
    mot2: {
      mot2_number: v.mot2_number,
      mot2_expiry: v.mot2_expiry,
      mot2_expiry_time: v.mot2_expiry_time,
      mot2_document: v.mot2_document,
    },
    insurance: {
      insurance_number: v.insurance_number,
      insurance_expiry: v.insurance_expiry,
      insurance_expiry_time: v.insurance_expiry_time,
      insurance_document: v.insurance_document,
    },
    phc_vehicle: {
      phc_vehicle_number: v.phc_vehicle_number,
      phc_vehicle_expiry: v.phc_vehicle_expiry,
      phc_vehicle_expiry_time: v.phc_vehicle_expiry_time,
      phc_vehicle_document: v.phc_vehicle_document,
    },
    road_tax: {
      road_tax_number: v.road_tax_number,
      road_tax_expiry: v.road_tax_expiry,
      road_tax_expiry_time: v.road_tax_expiry_time,
      road_tax_document: v.road_tax_document,
    },
    rental_agreement: {
      rental_agreement_number: v.rental_agreement_number,
      rental_agreement_expiry: v.rental_agreement_expiry,
      rental_agreement_expiry_time: v.rental_agreement_expiry_time,
      rental_agreement_document: v.rental_agreement_document,
    },
    v5_registration: {
      v5_registration_number: v.v5_registration_number,
      v5_registration_expiry: v.v5_registration_expiry,
      v5_registration_expiry_time: v.v5_registration_expiry_time,
      v5_registration_document: v.v5_registration_document,
    },
    licence: {
      licence_number: v.licence_number,
      licence_expiry: v.licence_expiry,
      licence_expiry_time: v.licence_expiry_time,
      licence_document: v.licence_document,
    },
    phc_driver: {
      phc_driver_number: v.phc_driver_number,
      phc_driver_expiry: v.phc_driver_expiry,
      phc_driver_expiry_time: v.phc_driver_expiry_time,
      phc_driver_document: v.phc_driver_document,
    },

    vehicle_type: v.vehicle_type,
  };
}
// Generate driveraccessToken NTG+2 digits
function generateSecurityCode() {
  let result = "NTG";
  const digits = Math.floor(10 + Math.random() * 90).toString();
  return result + digits;
}

async function generateUniqueDriverAccessToken(db) {
  while (true) {
    const token = generateSecurityCode(); // NTGxx

    const { rows } = await db.query(
      `SELECT id FROM drivers WHERE driver_access_token = $1 LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return token; // UNIQUE TOKEN FOUND
    }

    // If found → loop runs again to generate a new one
  }
}

const Driver = {
  // ✅ Check if username already exists
  async checkUsernameExists(username) {
    const query = `
      SELECT id FROM drivers 
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `;
    const result = await db.query(query, [username]);
    return result.rows.length > 0;
  },

  async create(data) {
    try {
      await db.query("BEGIN");

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const driverAccessToken = await generateUniqueDriverAccessToken(db);
      // Normalize empty fields
      Object.keys(data).forEach((key) => {
        if (data[key] === "" || data[key] === undefined) data[key] = null;
      });

      const { notes, shifts, vehicle: rawVehicle, ...driver } = data;

      let companyVehicleId = null;
      let useCompanyVehicle = false;
      let vehicleId = null;

      // 🟢 Handle company vehicle mapping
      if (driver.use_company_vehicle && driver.company_vehicle_id) {
        companyVehicleId = driver.company_vehicle_id;
        useCompanyVehicle = true;

        // 1️⃣ Fetch company vehicle details
        const { rows: companyVehicleRows } = await db.query(
          `SELECT 
          mot_number, mot_expiry, mot2_number, mot2_expiry,
          insurance_number, insurance_expiry,
          phc_vehicle_number, phc_vehicle_expiry
         FROM company_vehicles WHERE id = $1 LIMIT 1`,
          [companyVehicleId]
        );

        const companyVehicle = companyVehicleRows[0];

        if (companyVehicle) {
          // 2️⃣ Copy company vehicle document fields to driver
          driver.mot_number = companyVehicle.mot_number ?? null;
          driver.mot_expiry = companyVehicle.mot_expiry ?? null;
          driver.mot2_number = companyVehicle.mot2_number ?? null;
          driver.mot2_expiry = companyVehicle.mot2_expiry ?? null;
          driver.insurance_number = companyVehicle.insurance_number ?? null;
          driver.insurance_expiry = companyVehicle.insurance_expiry ?? null;
          driver.phc_vehicle_number = companyVehicle.phc_vehicle_number ?? null;
          driver.phc_vehicle_expiry = companyVehicle.phc_vehicle_expiry ?? null;
          driver.road_tax_number = companyVehicle.road_tax_number ?? null;
          driver.road_tax_expiry = companyVehicle.road_tax_expiry ?? null;
          driver.v5_registration_number =
            companyVehicle.v5_registration_number ?? null;
          driver.v5_registration_expiry =
            companyVehicle.v5_registration_expiry ?? null;
          driver.rental_agreement_number =
            companyVehicle.rental_agreement_number ?? null;
          driver.rental_agreement_expiry =
            companyVehicle.rental_agreement_expiry ?? null;
        }

        // 3️⃣ Mark company vehicle as assigned
        await db.query(
          `UPDATE company_vehicles SET assigned = true WHERE id = $1`,
          [companyVehicleId]
        );
      }

      // 🚫 Prevent conflict: both private & company vehicle
      if (useCompanyVehicle && rawVehicle?.vehicle_type_id) {
        throw new Error(
          "Driver cannot use both private and company vehicle at the same time."
        );
      }

      // 🟢 Insert driver
      const insertDriverQuery = `
      INSERT INTO drivers (
        subsidiary_id, username, password, name, email, mobile, telephone, address, dob,
        driver_type, driver_commission, rent_limit, rent_paid, balance, has_pda,
        use_company_vehicle, active, start_date, end_date,
        licence_number, licence_expiry, phc_driver_number, phc_driver_expiry,
        insurance_number, insurance_expiry, rental_agreement_number, rental_agreement_expiry,
        road_tax_number, road_tax_expiry, v5_registration_number, v5_registration_expiry,
        mot_number, mot_expiry, mot2_number, mot2_expiry, phc_vehicle_number, phc_vehicle_expiry,
        ni, image, company_vehicle_id, vehicle_id,
        licence_expiry_time, phc_driver_expiry_time, insurance_expiry_time, phc_vehicle_expiry_time,
        mot_expiry_time, mot2_expiry_time, v5_registration_expiry_time, road_tax_expiry_time,
        rental_agreement_expiry_time, driver_access_token
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,
        $20,$21,$22,$23,
        $24,$25,$26,$27,
        $28,$29,$30,$31,
        $32,$33,$34,$35,$36,$37,
        $38,$39,$40,$41,
        $42,$43,$44,$45,$46,$47,
        $48,$49,$50,$51
      )
      RETURNING id
    `;

      const driverRes = await db.query(insertDriverQuery, [
        driver.subsidiary_id,
        driver.username,
        hashedPassword,
        driver.name,
        driver.email,
        driver.mobile,
        driver.telephone,
        driver.address,
        driver.dob,
        driver.driver_type,
        driver.driver_commission,
        driver.rent_limit,
        driver.rent_paid,
        driver.balance,
        driver.has_pda,
        useCompanyVehicle,
        driver.active,
        driver.start_date,
        driver.end_date,
        driver.licence_number,
        driver.licence_expiry,
        driver.phc_driver_number,
        driver.phc_driver_expiry,
        driver.insurance_number,
        driver.insurance_expiry,
        driver.rental_agreement_number,
        driver.rental_agreement_expiry,
        driver.road_tax_number,
        driver.road_tax_expiry,
        driver.v5_registration_number,
        driver.v5_registration_expiry,
        driver.mot_number,
        driver.mot_expiry,
        driver.mot2_number,
        driver.mot2_expiry,
        driver.phc_vehicle_number,
        driver.phc_vehicle_expiry,
        driver.ni,
        driver.image,
        companyVehicleId,
        null,
        driver.licence_expiry_time,
        driver.phc_driver_expiry_time,
        driver.insurance_expiry_time,
        driver.phc_vehicle_expiry_time,
        driver.mot_expiry_time,
        driver.mot2_expiry_time,
        driver.v5_registration_expiry_time,
        driver.road_tax_expiry_time,
        driver.rental_agreement_expiry_time,
        driverAccessToken,
      ]);

      const driverId = driverRes.rows[0].id;

      const mergeValue = (v, d) =>
        v === undefined || v === null || v === "" ? d : v;

      // Prepare private vehicle data if applicable
      let vehicle = rawVehicle
        ? {
            ...rawVehicle,
            driver_id: driverId,
            licence_number: mergeValue(
              rawVehicle.licence_number,
              driver.licence_number
            ),
            licence_expiry: mergeValue(
              rawVehicle.licence_expiry,
              driver.licence_expiry
            ),
            licence_expiry_time: mergeValue(
              rawVehicle.licence_expiry_time,
              driver.licence_expiry_time
            ),
            phc_driver_number: mergeValue(
              rawVehicle.phc_driver_number,
              driver.phc_driver_number
            ),
            phc_driver_expiry: mergeValue(
              rawVehicle.phc_driver_expiry,
              driver.phc_driver_expiry
            ),
            phc_driver_expiry_time: mergeValue(
              rawVehicle.phc_driver_expiry_time,
              driver.phc_driver_expiry_time
            ),
            mot_number: mergeValue(rawVehicle.mot_number, driver.mot_number),
            mot_expiry: mergeValue(rawVehicle.mot_expiry, driver.mot_expiry),
            mot2_number: mergeValue(rawVehicle.mot2_number, driver.mot2_number),
            mot2_expiry: mergeValue(rawVehicle.mot2_expiry, driver.mot2_expiry),
            insurance_number: mergeValue(
              rawVehicle.insurance_number,
              driver.insurance_number
            ),
            insurance_expiry: mergeValue(
              rawVehicle.insurance_expiry,
              driver.insurance_expiry
            ),
            phc_vehicle_number: mergeValue(
              rawVehicle.phc_vehicle_number,
              driver.phc_vehicle_number
            ),
            phc_vehicle_expiry: mergeValue(
              rawVehicle.phc_vehicle_expiry,
              driver.phc_vehicle_expiry
            ),
            road_tax_number: mergeValue(
              rawVehicle.road_tax_number,
              driver.road_tax_number
            ),
            road_tax_expiry: mergeValue(
              rawVehicle.road_tax_expiry,
              driver.road_tax_expiry
            ),
            rental_agreement_number: mergeValue(
              rawVehicle.rental_agreement_number,
              driver.rental_agreement_number
            ),
            rental_agreement_expiry: mergeValue(
              rawVehicle.rental_agreement_expiry,
              driver.rental_agreement_expiry
            ),
            v5_registration_number: mergeValue(
              rawVehicle.v5_registration_number,
              driver.v5_registration_number
            ),
            v5_registration_expiry: mergeValue(
              rawVehicle.v5_registration_expiry,
              driver.v5_registration_expiry
            ),
            mot_expiry_time: mergeValue(
              rawVehicle.mot_expiry_time,
              driver.mot_expiry_time
            ),
            mot2_expiry_time: mergeValue(
              rawVehicle.mot2_expiry_time,
              driver.mot2_expiry_time
            ),
            insurance_expiry_time: mergeValue(
              rawVehicle.insurance_expiry_time,
              driver.insurance_expiry_time
            ),
            phc_vehicle_expiry_time: mergeValue(
              rawVehicle.phc_vehicle_expiry_time,
              driver.phc_vehicle_expiry_time
            ),
            road_tax_expiry_time: mergeValue(
              rawVehicle.road_tax_expiry_time,
              driver.road_tax_expiry_time
            ),
            rental_agreement_expiry_time: mergeValue(
              rawVehicle.rental_agreement_expiry_time,
              driver.rental_agreement_expiry_time
            ),
            v5_registration_expiry_time: mergeValue(
              rawVehicle.v5_registration_expiry_time,
              driver.v5_registration_expiry_time
            ),
          }
        : null;

      // Insert private vehicle if provided
      if (vehicle && vehicle.vehicle_type_id && !useCompanyVehicle) {
        const vehicleInsertRes = await db.query(
          `
        INSERT INTO vehicles (
          driver_id, vehicle_type_id, vehicle_number, make, model, color, owner,
          start_date, end_date, log_book_number, mot_number, mot_expiry,
          mot2_number, mot2_expiry, insurance_number, insurance_expiry,
          phc_vehicle_number, phc_vehicle_expiry,
          log_book_document, phc_vehicle_document, mot_document, mot2_document, insurance_document,
          company, assigned,
          mot_expiry_time, mot2_expiry_time, insurance_expiry_time, phc_vehicle_expiry_time,
          road_tax_number, road_tax_expiry, road_tax_expiry_time,
          rental_agreement_number, rental_agreement_expiry, rental_agreement_expiry_time,
          v5_registration_number, v5_registration_expiry, v5_registration_expiry_time,
          road_tax_document, phc_driver_document, v5_registration_document,
          rental_agreement_document, licence_document,
          licence_number, licence_expiry, licence_expiry_time,
          phc_driver_number, phc_driver_expiry, phc_driver_expiry_time
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,
          $13,$14,$15,$16,
          $17,$18,
          $19,$20,$21,$22,$23,
          false,false,
          $24,$25,$26,$27,
          $28,$29,$30,
          $31,$32,$33,
          $34,$35,$36,
          $37,$38,$39,$40,$41,
          $42,$43,$44,
          $45,$46,$47
        )
        RETURNING id
      `,
          [
            vehicle.driver_id,
            vehicle.vehicle_type_id,
            vehicle.vehicle_number,
            vehicle.make,
            vehicle.model,
            vehicle.color,
            vehicle.owner,
            vehicle.start_date,
            vehicle.end_date,
            vehicle.log_book_number,
            vehicle.mot_number,
            vehicle.mot_expiry,
            vehicle.mot2_number,
            vehicle.mot2_expiry,
            vehicle.insurance_number,
            vehicle.insurance_expiry,
            vehicle.phc_vehicle_number,
            vehicle.phc_vehicle_expiry,
            vehicle.log_book_document,
            vehicle.PHC_VEHICLE_DOCUMENT,
            vehicle.MOT_DOCUMENT,
            vehicle.MOT2_DOCUMENT,
            vehicle.INSURANCE_DOCUMENT,
            vehicle.mot_expiry_time,
            vehicle.mot2_expiry_time,
            vehicle.insurance_expiry_time,
            vehicle.phc_vehicle_expiry_time,
            vehicle.road_tax_number,
            vehicle.road_tax_expiry,
            vehicle.road_tax_expiry_time,
            vehicle.rental_agreement_number,
            vehicle.rental_agreement_expiry,
            vehicle.rental_agreement_expiry_time,
            vehicle.v5_registration_number,
            vehicle.v5_registration_expiry,
            vehicle.v5_registration_expiry_time,
            vehicle.ROAD_TAX_DOCUMENT,
            vehicle.PHC_DRIVER_DOCUMENT,
            vehicle.V5_REGISTRATION_DOCUMENT,
            vehicle.RENTAL_AGREEMENT_DOCUMENT,
            vehicle.LICENCE_DOCUMENT,
            vehicle.licence_number,
            vehicle.licence_expiry,
            vehicle.licence_expiry_time,
            vehicle.phc_driver_number,
            vehicle.phc_driver_expiry,
            vehicle.phc_driver_expiry_time,
          ]
        );

        vehicleId = vehicleInsertRes.rows[0].id;
        await db.query(`UPDATE drivers SET vehicle_id = $1 WHERE id = $2`, [
          vehicleId,
          driverId,
        ]);
      }

      // Insert driver notes
      if (Array.isArray(notes) && notes.length) {
        for (const note of notes) {
          await db.query(
            `INSERT INTO driver_notes (driver_id, note, created_at, created_by)
           VALUES ($1, $2, $3, $4)`,
            [
              driverId,
              note.note,
              note.created_at || new Date(),
              note.created_by || "system",
            ]
          );
        }
      }

      // Insert driver shifts
      if (Array.isArray(shifts) && shifts.length) {
        for (const shift of shifts) {
          await db.query(
            `INSERT INTO driver_shifts (driver_id, name, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
            [driverId, shift.name, shift.start_time, shift.end_time]
          );
        }
      }

      await db.query("COMMIT");
      return { id: driverId, vehicle_id: vehicleId || null };
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("❌ Error creating driver:", err);
      throw new Error(
        err.message.includes("relation")
          ? "Database table missing (check driver_shifts, driver_notes, or vehicles table)"
          : err.message
      );
    }
  },

  async getAll({
    page = 1,
    limit = 50,
    username,
    name,
    mobile,
    mot_expiry,
    mot2_expiry,
    insurance_expiry,
    licence_expiry,
    driver_end_date,
    vehicle_end_date,
    vehicle_type,
    subsidiary,
    active = true,
  } = {}) {
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let idx = 1;

    // Filter active by default
    if (active !== undefined) {
      conditions.push(`d.active = $${idx++}`);
      params.push(active === "false" ? false : true);
    }

    if (username) {
      conditions.push(`d.username ILIKE $${idx++}`);
      params.push(`%${username}%`);
    }
    if (name) {
      conditions.push(`d.name ILIKE $${idx++}`);
      params.push(`%${name}%`);
    }
    if (mobile) {
      conditions.push(`d.mobile ILIKE $${idx++}`);
      params.push(`%${mobile}%`);
    }
    if (mot_expiry) {
      conditions.push(`d.mot_expiry ILIKE $${idx++}`);
      params.push(`%${mot_expiry}%`);
    }
    if (mot2_expiry) {
      conditions.push(`d.mot2_expiry ILIKE $${idx++}`);
      params.push(`%${mot2_expiry}%`);
    }
    if (insurance_expiry) {
      conditions.push(`d.insurance_expiry ILIKE $${idx++}`);
      params.push(`%${insurance_expiry}%`);
    }
    if (licence_expiry) {
      conditions.push(`d.licence_expiry ILIKE $${idx++}`);
      params.push(`%${licence_expiry}%`);
    }
    if (driver_end_date) {
      conditions.push(`d.end_date ILIKE $${idx++}`);
      params.push(`%${driver_end_date}%`);
    }
    if (vehicle_end_date) {
      conditions.push(`v.end_date ILIKE $${idx++}`);
      params.push(`%${vehicle_end_date}%`);
    }

    if (vehicle_type) {
      conditions.push(
        `(vt_v.name ILIKE $${idx++} OR vt_cv.name ILIKE $${idx++})`
      );
      params.push(`%${vehicle_type}%`, `%${vehicle_type}%`);
    }
    if (subsidiary) {
      conditions.push(`s.name ILIKE $${idx++}`);
      params.push(`%${subsidiary}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Count query
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM drivers d
    LEFT JOIN subsidiaries s ON s.id = d.subsidiary_id
    LEFT JOIN vehicles v ON v.id = d.vehicle_id
    LEFT JOIN vehicle_types vt_v ON vt_v.id = v.vehicle_type_id
    LEFT JOIN company_vehicles cv ON cv.id = d.company_vehicle_id
    LEFT JOIN vehicle_types vt_cv ON vt_cv.id = cv.vehicle_type_id
    ${whereClause};
  `;
    const countResult = await db.query(countQuery, params);
    const total = Number(countResult.rows[0].total) || 0;

    // Data query
    params.push(limit, offset);
    const dataQuery = `
    SELECT 
      d.*,
      s.name AS subsidiary_name,
      CASE 
        WHEN d.use_company_vehicle = true THEN
          json_build_object(
            'vehicle_number', cv.vehicle_number,
            'make', cv.make,
            'model', cv.model,
            'color', cv.color,
            'end_date', cv.end_date,
            'vehicle_type', json_build_object(
              'id', vt_cv.id,
              'name', vt_cv.name,
              'passengers', vt_cv.passengers,
              'luggages', vt_cv.luggages,
              'driver_waiting_charges', vt_cv.driver_waiting_charges
            )
          )
        ELSE
          json_build_object(
            'vehicle_number', v.vehicle_number,
            'make', v.make,
            'model', v.model,
            'color', v.color,
            'end_date', v.end_date,
            'vehicle_type', json_build_object(
              'id', vt_v.id,
              'name', vt_v.name,
              'passengers', vt_v.passengers,
              'luggages', vt_v.luggages,
              'driver_waiting_charges', vt_v.driver_waiting_charges
            )
          )
      END AS vehicle
    FROM drivers d
    LEFT JOIN subsidiaries s ON s.id = d.subsidiary_id
    LEFT JOIN vehicles v ON v.id = d.vehicle_id
    LEFT JOIN vehicle_types vt_v ON vt_v.id = v.vehicle_type_id
    LEFT JOIN company_vehicles cv ON cv.id = d.company_vehicle_id
    LEFT JOIN vehicle_types vt_cv ON vt_cv.id = cv.vehicle_type_id
    ${whereClause}
    ORDER BY d.id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length};
  `;

    const res = await db.query(dataQuery, params);

    return {
      total,
      drivers: res.rows.map((row) => ({
        ...normalizeDriverDates(row),
        subsidiary: { name: row.subsidiary_name },
        vehicle: row.vehicle || null,
      })),
    };
  },

  async getById(id) {
    try {
      await db.query("BEGIN");

      // 🧱 Fetch driver main record
      const driverRes = await db.query(
        `SELECT d.*, s.name AS subsidiary_name
       FROM drivers d
       LEFT JOIN subsidiaries s ON s.id = d.subsidiary_id
       WHERE d.id = $1`,
        [id]
      );

      if (driverRes.rows.length === 0) {
        await db.query("ROLLBACK");
        return null;
      }

      const driver = driverRes.rows[0];

      // 📝 Notes
      const notesRes = await db.query(
        `SELECT id, note, created_at, created_by
       FROM driver_notes
       WHERE driver_id = $1
       ORDER BY created_at DESC`,
        [id]
      );

      // ⏰ Shifts
      const shiftsRes = await db.query(
        `SELECT id, name, start_time, end_time
       FROM driver_shifts
       WHERE driver_id = $1
       ORDER BY id ASC`,
        [id]
      );

      // 🚗 Vehicle (dynamic source)
      let vehicleRes;
      if (driver.use_company_vehicle) {
        vehicleRes = await db.query(
          `SELECT 
            cv.*,
            json_build_object(
              'id', vt.id,
              'name', vt.name,
              'driver_waiting_charges', vt.driver_waiting_charges,
              'account_waiting_charges', vt.account_waiting_charges,
              'waiting_time', vt.waiting_time
            ) AS vehicle_type
         FROM company_vehicles cv
         LEFT JOIN vehicle_types vt ON vt.id = cv.vehicle_type_id
         WHERE cv.id = $1
         LIMIT 1`,
          [driver.company_vehicle_id]
        );
      } else {
        vehicleRes = await db.query(
          `SELECT 
            v.*,
            json_build_object(
              'id', vt.id,
              'name', vt.name,
              'driver_waiting_charges', vt.driver_waiting_charges,
              'account_waiting_charges', vt.account_waiting_charges,
              'waiting_time', vt.waiting_time
            ) AS vehicle_type
         FROM vehicles v
         LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
         WHERE v.id = $1
         LIMIT 1`,
          [driver.vehicle_id]
        );
      }

      await db.query("COMMIT");

      const vehicleRow = vehicleRes.rows[0] || null;
      const formattedVehicle = vehicleRow ? formatVehicle(vehicleRow) : null;

      const fullDriver = {
        ...normalizeDriverDates(driver),
        notes: notesRes.rows,
        shifts: shiftsRes.rows,
        vehicle: formattedVehicle,
      };

      return fullDriver;
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  },

  // async update(driverId, data) {
  //   try {
  //     await db.query("BEGIN");

  //     // ✅ Fetch existing driver
  //     const { rows } = await db.query(
  //       `SELECT * FROM drivers WHERE id = $1`,
  //       [driverId]
  //     );
  //     if (!rows.length) throw new Error("Driver not found");
  //     const existingDriver = rows[0];

  //     // ✅ Merge with existing data
  //     const mergedDriver = { ...existingDriver, ...data };

  //     // ✅ Handle password
  //     if (data.password) {
  //       const salt = await bcrypt.genSalt(10);
  //       mergedDriver.password = await bcrypt.hash(data.password, salt);
  //     }

  //     // ✅ Handle image
  //     if (data.image) {
  //       mergedDriver.image = data.image;
  //     }

  //     // ✅ All updatable fields
  //     const driverFields = [
  //       "name",
  //       "username",
  //       "email",
  //       "password",
  //       "mobile",
  //       "telephone",
  //       "address",
  //       "dob",
  //       "driver_type",
  //       "driver_commission",
  //       "rent_limit",
  //       "rent_paid",
  //       "balance",
  //       "has_pda",
  //       "use_company_vehicle",
  //       "active",
  //       "start_date",
  //       "end_date",
  //       "licence_number",
  //       "licence_expiry",
  //       "phc_driver_number",
  //       "phc_driver_expiry",
  //       "insurance_number",
  //       "insurance_expiry",
  //       "rental_agreement_number",
  //       "rental_agreement_expiry",
  //       "road_tax_number",
  //       "road_tax_expiry",
  //       "v5_registration_number",
  //       "v5_registration_expiry",
  //       "mot_number",
  //       "mot_expiry",
  //       "mot2_number",
  //       "mot2_expiry",
  //       "phc_vehicle_number",
  //       "phc_vehicle_expiry",
  //       "ni",
  //       "licence_expiry_time",
  //       "phc_driver_expiry_time",
  //       "insurance_expiry_time",
  //       "phc_vehicle_expiry_time",
  //       "mot_expiry_time",
  //       "mot2_expiry_time",
  //       "v5_registration_expiry_time",
  //       "road_tax_expiry_time",
  //       "rental_agreement_expiry_time",
  //       "image",
  //     ];

  //     // ✅ Dynamic query builder
  //     const updates = [];
  //     const values = [];
  //     let i = 1;
  //     for (const field of driverFields) {
  //       if (field in mergedDriver) {
  //         updates.push(`${field} = $${i++}`);
  //         values.push(mergedDriver[field]);
  //       }
  //     }

  //     if (updates.length) {
  //       values.push(driverId);
  //       await db.query(
  //         `UPDATE drivers SET ${updates.join(", ")} WHERE id = $${i}`,
  //         values
  //       );
  //     }

  //     // ✅ Vehicle Update or Insert
  //     if (data.vehicle && Object.keys(data.vehicle).length) {
  //       const { rows: veh } = await db.query(
  //         `SELECT id FROM vehicles WHERE driver_id = $1 LIMIT 1`,
  //         [driverId]
  //       );

  //       if (veh.length) {
  //         const vehicleId = veh[0].id;
  //         const vehicleUpdates = [];
  //         const vehicleValues = [];
  //         let j = 1;

  //         for (const [k, v] of Object.entries(data.vehicle)) {
  //           vehicleUpdates.push(`${k} = $${j++}`);
  //           vehicleValues.push(v);
  //         }

  //         vehicleValues.push(vehicleId);
  //         await db.query(
  //           `UPDATE vehicles SET ${vehicleUpdates.join(", ")} WHERE id = $${j}`,
  //           vehicleValues
  //         );
  //       } else {
  //         const keys = Object.keys(data.vehicle);
  //         const placeholders = keys.map((_, idx) => `$${idx + 1}`);
  //         const values = Object.values(data.vehicle);
  //         await db.query(
  //           `INSERT INTO vehicles (${keys.join(", ")}, driver_id)
  //            VALUES (${placeholders.join(", ")}, $${values.length + 1})`,
  //           [...values, driverId]
  //         );
  //       }
  //     }

  //     // ✅ Replace Notes
  //     if (Array.isArray(data.notes)) {
  //       await db.query(`DELETE FROM driver_notes WHERE driver_id = $1`, [
  //         driverId,
  //       ]);
  //       for (const n of data.notes) {
  //         await db.query(
  //           `INSERT INTO driver_notes (driver_id, note, created_at, created_by)
  //            VALUES ($1, $2, $3, $4)`,
  //           [
  //             driverId,
  //             n.note,
  //             n.created_at || new Date(),
  //             n.created_by || "system",
  //           ]
  //         );
  //       }
  //     }

  //     // ✅ Replace Shifts
  //     if (Array.isArray(data.shifts)) {
  //       await db.query(`DELETE FROM driver_shifts WHERE driver_id = $1`, [
  //         driverId,
  //       ]);
  //       for (const s of data.shifts) {
  //         await db.query(
  //           `INSERT INTO driver_shifts (driver_id, name, start_time, end_time)
  //            VALUES ($1, $2, $3, $4)`,
  //           [driverId, s.name, s.start_time, s.end_time]
  //         );
  //       }
  //     }

  //     await db.query("COMMIT");

  //     // ✅ Return latest driver record
  //     return await Driver.getById(driverId);
  //   } catch (err) {
  //     await db.query("ROLLBACK");
  //     console.error("❌ Error updating driver:", err);
  //     throw err;
  //   }
  // },

  async update(driverId, data) {
    try {
      await db.query("BEGIN");

      // ✅ Fetch existing driver
      const { rows } = await db.query(`SELECT * FROM drivers WHERE id = $1`, [
        driverId,
      ]);
      if (!rows.length) throw new Error("Driver not found");
      const existingDriver = rows[0];

      // ✅ Merge old data with new
      const mergedDriver = { ...existingDriver, ...data };

      // ✅ Hash password if provided
      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        mergedDriver.password = await bcrypt.hash(data.password, salt);
      }

      // ✅ Handle image
      if (data.image) {
        mergedDriver.image = data.image;
      }

      // ✅ Handle company vehicle vs personal vehicle toggle
      if (typeof data.use_company_vehicle !== "undefined") {
        if (data.use_company_vehicle) {
          mergedDriver.use_company_vehicle = true;
          mergedDriver.vehicle_id = null; // remove personal vehicle link
        } else {
          mergedDriver.use_company_vehicle = false;
          mergedDriver.company_vehicle_id = null; // remove company vehicle link
        }
      }

      // ✅ List of fields to update
      const driverFields = [
        "name",
        "username",
        "email",
        "password",
        "mobile",
        "telephone",
        "address",
        "dob",
        "driver_type",
        "driver_commission",
        "rent_limit",
        "rent_paid",
        "balance",
        "has_pda",
        "use_company_vehicle",
        "company_vehicle_id",
        "vehicle_id",
        "active",
        "start_date",
        "end_date",
        "licence_number",
        "licence_expiry",
        "phc_driver_number",
        "phc_driver_expiry",
        "insurance_number",
        "insurance_expiry",
        "rental_agreement_number",
        "rental_agreement_expiry",
        "road_tax_number",
        "road_tax_expiry",
        "v5_registration_number",
        "v5_registration_expiry",
        "mot_number",
        "mot_expiry",
        "mot2_number",
        "mot2_expiry",
        "phc_vehicle_number",
        "phc_vehicle_expiry",
        "ni",
        "licence_expiry_time",
        "phc_driver_expiry_time",
        "insurance_expiry_time",
        "phc_vehicle_expiry_time",
        "mot_expiry_time",
        "mot2_expiry_time",
        "v5_registration_expiry_time",
        "road_tax_expiry_time",
        "rental_agreement_expiry_time",
        "image",
      ];

      // ✅ Build dynamic query for driver update
      const updates = [];
      const values = [];
      let i = 1;

      for (const field of driverFields) {
        if (field in mergedDriver) {
          updates.push(`${field} = $${i++}`);
          values.push(mergedDriver[field]);
        }
      }

      if (updates.length) {
        values.push(driverId);
        await db.query(
          `UPDATE drivers SET ${updates.join(", ")} WHERE id = $${i}`,
          values
        );
      }

      // ✅ Handle personal vehicle
      if (
        !mergedDriver.use_company_vehicle &&
        data.vehicle &&
        Object.keys(data.vehicle).length
      ) {
        const { rows: existingVeh } = await db.query(
          `SELECT id FROM vehicles WHERE driver_id = $1 LIMIT 1`,
          [driverId]
        );

        let vehicleId;

        if (existingVeh.length) {
          // Update existing vehicle
          const vehId = existingVeh[0].id;
          const keys = Object.keys(data.vehicle);
          const setClause = keys
            .map((key, idx) => `${key} = $${idx + 1}`)
            .join(", ");
          const values = Object.values(data.vehicle);

          const { rows: updatedVeh } = await db.query(
            `UPDATE vehicles SET ${setClause} WHERE id = $${
              keys.length + 1
            } RETURNING id`,
            [...values, vehId]
          );
          vehicleId = updatedVeh[0].id;
        } else {
          // Insert new vehicle
          const keys = Object.keys(data.vehicle);
          const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
          const values = Object.values(data.vehicle);

          const { rows: newVeh } = await db.query(
            `INSERT INTO vehicles (${keys.join(", ")}, driver_id)
           VALUES (${placeholders}, $${values.length + 1})
           RETURNING id`,
            [...values, driverId]
          );
          vehicleId = newVeh[0].id;
        }

        // ✅ Link driver to this vehicle
        await db.query(
          `UPDATE drivers 
         SET vehicle_id = $1, 
             company_vehicle_id = null, 
             use_company_vehicle = false
         WHERE id = $2`,
          [vehicleId, driverId]
        );
      }

      // ✅ Replace Notes
      if (Array.isArray(data.notes)) {
        await db.query(`DELETE FROM driver_notes WHERE driver_id = $1`, [
          driverId,
        ]);
        for (const n of data.notes) {
          await db.query(
            `INSERT INTO driver_notes (driver_id, note, created_at, created_by)
           VALUES ($1, $2, $3, $4)`,
            [
              driverId,
              n.note,
              n.created_at || new Date(),
              n.created_by || "system",
            ]
          );
        }
      }

      // ✅ Replace Shifts
      if (Array.isArray(data.shifts)) {
        await db.query(`DELETE FROM driver_shifts WHERE driver_id = $1`, [
          driverId,
        ]);
        for (const s of data.shifts) {
          await db.query(
            `INSERT INTO driver_shifts (driver_id, name, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
            [driverId, s.name, s.start_time, s.end_time]
          );
        }
      }

      await db.query("COMMIT");

      // ✅ Return updated driver record
      return await Driver.getById(driverId);
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("❌ Error updating driver:", err);
      throw err;
    }
  },

  async delete(id) {
    try {
      await db.query("BEGIN");
      // 🔹 Check if driver exists
      const { rows } = await db.query(`SELECT id FROM drivers WHERE id = $1`, [
        id,
      ]);
      if (rows.length === 0) {
        await db.query("ROLLBACK");
        const error = new Error("Driver not found");
        error.code = "NOT_FOUND";
        throw error;
      }
      // 🔹 Delete related driver shifts
      await db.query(`DELETE FROM driver_shifts WHERE driver_id = $1`, [id]);

      // 🔹 Delete related driver notes
      await db.query(`DELETE FROM driver_notes WHERE driver_id = $1`, [id]);

      // 🔹 Delete attached vehicle(s)
      await db.query(`DELETE FROM vehicles WHERE driver_id = $1`, [id]);

      // 🔹 Finally delete the driver
      await db.query(`DELETE FROM drivers WHERE id = $1`, [id]);

      await db.query("COMMIT");
      return true;
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("❌ Error deleting driver:", err);
      throw err;
    }
  },
  // Find driver by username (case-insensitive)
async findDriverByUsername(username) {
  const query = `
        SELECT * FROM drivers 
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
    `;
  const result = await db.query(query, [username]);
  // console.log(result)
  return result.rows[0];
},

// Update driver login session
async updateDriverLoginStatus(driverId) {
  const query = `
        UPDATE drivers 
        SET 
          session_status = 'logged_in',
          driver_status = 'Available',
          booking_status = 'Available'
        WHERE id = $1
      `;
  return db.query(query, [driverId]);
},
};

module.exports = Driver;
