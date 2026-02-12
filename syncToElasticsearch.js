const db = require("./src/db/index"); // 👈 pool nahi, object milega
const client = require("./elasticsearchClient");

const CHUNK_SIZE = 5000;

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function syncData() {
  try {
    const res = await db.query("SELECT * FROM address"); // 👈 db.query
    const allAddresses = res.rows;

    console.log(`Fetched ${allAddresses.length} rows from Postgres`);

    const chunks = chunkArray(allAddresses, CHUNK_SIZE);

    for (const [i, chunk] of chunks.entries()) {
      const body = chunk.flatMap((doc) => [
        { index: { _index: "addresses", _id: doc._id } },
        {
          name: doc.name,
          postcode: doc.postcode,
          area: doc.area,
          district: doc.district,
          sector: doc.sector,
          unit: doc.unit,
          type: doc.type,
          lat: doc.lat,
          lon: doc.lon,
        },
      ]);

      const response = await client.bulk({
        refresh: true,
        operations: body,
      });

      if (response.errors) {
        console.error("❌ Some documents failed to index");
      } else {
        console.log(
          `✅ [${i + 1}/${chunks.length}] Indexed chunk of ${chunk.length} documents`,
        );
      }
    }

    console.log("✅ All data synced to Elasticsearch");
  } catch (err) {
    console.error("Error syncing data:", err);
  } finally {
    await db.pool.end(); // 👈 ab sahi
  }
}

syncData();
