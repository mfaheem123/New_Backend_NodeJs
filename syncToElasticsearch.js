// const db = require("./src/db/index"); // 👈 pool nahi, object milega
// const client = require("./elasticsearchClient");

// const CHUNK_SIZE = 5000;

// function chunkArray(array, size) {
//   const result = [];
//   for (let i = 0; i < array.length; i += size) {
//     result.push(array.slice(i, i + size));
//   }
//   return result;
// }

// async function syncData() {
//   try {
//     const res = await db.query("SELECT * FROM address"); // 👈 db.query
//     const allAddresses = res.rows;

//     console.log(`Fetched ${allAddresses.length} rows from Postgres`);

//     const chunks = chunkArray(allAddresses, CHUNK_SIZE);

//     for (const [i, chunk] of chunks.entries()) {
//       const body = chunk.flatMap((doc) => [
//         { index: { _index: "addresses", _id: doc._id } },
//         {
//           name: doc.name,
//           postcode: doc.postcode,
//           area: doc.area,
//           district: doc.district,
//           sector: doc.sector,
//           unit: doc.unit,
//           type: doc.type,
//           lat: doc.lat,
//           lon: doc.lon,
//         },
//       ]);

//       const response = await client.bulk({
//         refresh: true,
//         operations: body,
//       });

//       if (response.errors) {
//         console.error("❌ Some documents failed to index");
//       } else {
//         console.log(
//           `✅ [${i + 1}/${chunks.length}] Indexed chunk of ${chunk.length} documents`,
//         );
//       }
//     }

//     console.log("✅ All data synced to Elasticsearch");
//   } catch (err) {
//     console.error("Error syncing data:", err);
//   } finally {
//     await db.pool.end(); // 👈 ab sahi
//   }
// }

// syncData();


const db = require("./src/db/index"); // db connection
const client = require("./elasticsearchClient");

const BATCH_SIZE = 5000; // Har bar sirf 5000 rows RAM me aayenge

async function syncData() {
  let lastId = ""; // Track karne ke liye ke last konsa ID sync hua hai
  let processedCount = 0;

  try {
    console.log("🚀 Sync process started...");

    // 1. Pehle Total Count nikalein progress dekhte rehne ke liye
    const countResult = await db.query("SELECT COUNT(*) FROM address");
    const totalRows = parseInt(countResult.rows[0].count, 10);
    console.log(`📊 Total rows to sync: ${totalRows.toLocaleString()}`);

    while (true) {
      // 2. Sirf BATCH_SIZE (5000) rows fetch karein _id ke hisab se
      const query = lastId
        ? "SELECT _id, name, postcode, area, district, sector, unit, type, lat, lon FROM address WHERE _id > $1 ORDER BY _id ASC LIMIT $2"
        : "SELECT _id, name, postcode, area, district, sector, unit, type, lat, lon FROM address ORDER BY _id ASC LIMIT $1";

      const params = lastId ? [lastId, BATCH_SIZE] : [BATCH_SIZE];
      const res = await db.query(query, params);

      const rows = res.rows;

      // Agar mazeed rows nahi bache, toh loop break kardo
      if (rows.length === 0) {
        break;
      }

      // 3. Elasticsearch bulk operations array tayar karein
      const operations = rows.flatMap((doc) => {
        // Location mapping (Agar aapne geo_point mapping rakhi hai)
        const location =
          doc.lat != null && doc.lon != null
            ? { lat: doc.lat, lon: doc.lon }
            : undefined;

        return [
          { index: { _index: "addresses", _id: doc._id } },
          {
            name: doc.name,
            postcode: doc.postcode,
            area: doc.area,
            district: doc.district,
            sector: doc.sector,
            unit: doc.unit,
            type: doc.type,
            location: location,
            lat: doc.lat,
            lon: doc.lon,
          },
        ];
      });

      // 4. Elasticsearch me Bulk Insert karein
      // (Note: refresh: false rakha hai taakay insertion ultra-fast ho)
      const response = await client.bulk({
        operations: operations,
        refresh: false, 
      });

      if (response.errors) {
        console.error("⚠️ Some documents had errors during bulk indexing");
      }

      // Pointer update karein
      lastId = rows[rows.length - 1]._id;
      processedCount += rows.length;

      const percentage = ((processedCount / totalRows) * 100).toFixed(2);
      console.log(
        `✅ Synced ${processedCount.toLocaleString()} / ${totalRows.toLocaleString()} (${percentage}%)`
      );
    }

    console.log("🎉 All 30 Million records successfully synced to Elasticsearch!");

  } catch (err) {
    console.error("❌ Error syncing data:", err);
  } finally {
    if (db.pool) {
      await db.pool.end();
    }
  }
}

syncData();

///////////////////////////////////// VERIFY DATA IN ELASTICSEARCH  ///////////////////////////////////////

// const db = require("./src/db/index");
// const client = require("./elasticsearchClient");

// async function verifySyncData() {
//   try {
//     // 1. Get total count from PostgreSQL
//     const pgRes = await db.query("SELECT COUNT(*) FROM address");
//     const pgCount = parseInt(pgRes.rows[0].count, 10);

//     // 2. Refresh ES index to get accurate live count
//     await client.indices.refresh({ index: "addresses" });

//     // 3. Get total indexed count from Elasticsearch
//     const esRes = await client.count({ index: "addresses" });
//     const esCount = esRes.count;

//     console.log("-----------------------------------------");
//     console.log(`📊 PostgreSQL Total Records   : ${pgCount.toLocaleString()}`);
//     console.log(`🔍 Elasticsearch Indexed Total: ${esCount.toLocaleString()}`);
//     console.log(`❌ Missing / Rejected Count   : ${(pgCount - esCount).toLocaleString()}`);
//     console.log("-----------------------------------------");

//     if (pgCount === esCount) {
//       console.log("✅ Mubarak ho! Tamam records successfully index ho chuke hain.");
//     } else {
//       console.log("⚠️ Kuch records reject huye hain. Reason check karne ke liye niche Method 2 ya 3 dekhein.");
//     }
//   } catch (err) {
//     console.error("Error during check:", err);
//   } finally {
//     if (db.pool) await db.pool.end();
//   }
// }

// verifySyncData();