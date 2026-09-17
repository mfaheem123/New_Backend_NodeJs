// const fs = require("fs");
// const db = require("./src/db/index");
// const client = require("./elasticsearchClient");

// const BATCH_SIZE = 5000;
// const LOG_FILE = "./rejected_records.json";

// async function findRejectedRecords() {
//   let lastId = "";
//   let checkedCount = 0;
//   let rejectedCount = 0;
//   const rejectedSample = [];

//   console.log("🔍 Missing/Rejected documents ka audit shuru ho raha hai...\n");

//   try {
//     while (true) {
//       const query = lastId
//         ? "SELECT _id, name, postcode, area, district, sector, unit, type, lat, lon FROM address WHERE _id > $1 ORDER BY _id ASC LIMIT $2"
//         : "SELECT _id, name, postcode, area, district, sector, unit, type, lat, lon FROM address ORDER BY _id ASC LIMIT $1";

//       const params = lastId ? [lastId, BATCH_SIZE] : [BATCH_SIZE];
//       const res = await db.query(query, params);
//       const rows = res.rows;

//       if (rows.length === 0) break;

//       // Current batch ki tamam IDs ko Elasticsearch msearch API se check karein
//       const body = rows.flatMap((row) => [
//         { index: "addresses" },
//         { _source: false, query: { ids: { values: [row._id.toString()] } } }
//       ]);

//       const msearchRes = await client.msearch({ searches: body });

//       rows.forEach((row, index) => {
//         const hits = msearchRes.responses[index]?.hits?.hits || [];
//         if (hits.length === 0) {
//           rejectedCount++;
//           // High-level audit ke liye sample collect karein
//           if (rejectedSample.length < 1000) {
//             rejectedSample.push(row);
//           }
//         }
//       });

//       lastId = rows[rows.length - 1]._id;
//       checkedCount += rows.length;

//       if (checkedCount % 50000 === 0 || checkedCount >= 29990432) {
//         console.log(`⏱️ Checked: ${checkedCount.toLocaleString()} | Found Missing: ${rejectedCount.toLocaleString()}`);
//       }
//     }

//     // Rejected samples ko JSON file mai dump karein
//     fs.writeFileSync(LOG_FILE, JSON.stringify(rejectedSample, null, 2));
//     console.log(`\n✅ Audit Complete! First 1,000 rejected rows saved to: ${LOG_FILE}`);

//   } catch (err) {
//     console.error("❌ Error during audit:", err);
//   } finally {
//     if (db.pool) await db.pool.end();
//   }
// }

// findRejectedRecords();

const client = require("./elasticsearchClient");

async function resetIndex() {
  try {
    const indexName = "addresses";

    // 1. Agar index exist karta hai toh delete karein
    const exists = await client.indices.exists({ index: indexName });
    if (exists) {
      await client.indices.delete({ index: indexName });
      console.log(`🗑️ Index '${indexName}' deleted successfully.`);
    }

    // 2. Naya Index Mapping ke sath create karein
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            name: { type: "text" },
            postcode: { type: "keyword" },
            area: { type: "keyword" },
            district: { type: "keyword" },
            sector: { type: "keyword" },
            unit: { type: "keyword" },
            type: { type: "keyword" },
            location: { type: "geo_point" },
            lat: { type: "double" },
            lon: { type: "double" }
          }
        }
      }
    });

    console.log(`✅ Index '${indexName}' created successfully with new mappings!`);
  } catch (error) {
    console.error("❌ Error resetting index:", error);
  }
}

resetIndex();