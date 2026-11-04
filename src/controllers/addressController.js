const client = require("../../elasticsearchClient");

// Get All Addresses
const getAllAddresses = async (req, res) => {
  try {
    const response = await client.search({
      index: "addresses",
      size: 10000,
      query: { match_all: {} },
    });

    const hits = response.hits.hits.map((hit) => hit._source);
    res.status(200).json(hits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

/////////////////////////////// SEARCH LOCATION WITH POSTCODE EXACT OLD ///////////////////////////////
// const searchAddresses = async (req, res) => {
//   try {
//     const rawSearch = req.query.search.trim();
//     const search = rawSearch.toUpperCase();

//     // 🧠 Detect if input is a postcode or prefix of one
//     const isPostcodeLike = /^[A-Z]{1,2}\d{0,2}[A-Z]?\s*\d?[A-Z]{0,2}$/i.test(
//       search,
//     );

//     const response = await client.search({
//       index: "addresses",
//       size: 100,
//       query: {
//         bool: {
//           should: [
//             // 1️⃣ Exact postcode match (for full postcodes)
//             {
//               match_phrase: {
//                 postcode: {
//                   query: search,
//                   boost: 10,
//                 },
//               },
//             },
//             {
//               match_phrase: {
//                 unit: {
//                   query: search,
//                   boost: 8,
//                 },
//               },
//             },

//             // 2️⃣ Partial postcode prefix search (TN / TN3 / TN37 / TN37 6)
//             ...(isPostcodeLike
//               ? [
//                   {
//                     wildcard: {
//                       postcode: {
//                         value: `${search.replace(/\s/g, "")}*`,
//                         boost: 6,
//                       },
//                     },
//                   },
//                   {
//                     wildcard: {
//                       unit: {
//                         value: `${search.replace(/\s/g, "")}*`,
//                         boost: 5,
//                       },
//                     },
//                   },
//                 ]
//               : []),

//             // 3️⃣ Street or building name fallback
//             {
//               match_phrase_prefix: {
//                 name: {
//                   query: rawSearch,
//                   boost: 2,
//                 },
//               },
//             },
//           ],
//           minimum_should_match: 1,
//         },
//       },
//     });

//     const hits = response.hits.hits.map((h) => h._source);

//     // 🧹 Clean duplicates
//     const unique = hits.filter(
//       (v, i, a) =>
//         a.findIndex((t) => t.name === v.name && t.postcode === v.postcode) ===
//         i,
//     );

//     res.status(200).json(unique);
//   } catch (err) {
//     console.error("Address search failed:", err);
//     res.status(500).json({ message: "Search failed" });
//   }
// };

/////////////////////////////// SEARCH LOCATION WITH POSTCODE EXACT NEW ///////////////////////////////
// const searchAddresses = async (req, res) => {
//   try {
//     const rawSearch = (req.query.search || "").trim();
//     if (!rawSearch) return res.status(200).json([]);

//     const search = rawSearch.toUpperCase();
//     const cleanSearchNoSpace = search.replace(/\s+/g, "");

//     // Regex check for postcode pattern
//     const isPostcodeLike = /^[A-Z]{1,2}\d{0,2}[A-Z]?\s*\d?[A-Z]{0,2}$/i.test(
//       search,
//     );

//     const shouldQueries = [
//       // 1️⃣ Exact match (High Priority)
//       {
//         match_phrase: {
//           postcode: { query: search, boost: 10 },
//         },
//       },
//       {
//         match_phrase: {
//           unit: { query: search, boost: 8 },
//         },
//       },
//     ];

//     // 2️⃣ Prefix Match (Ultra Fast alternative to Wildcard)
//     if (isPostcodeLike) {
//       shouldQueries.push(
//         {
//           prefix: {
//             postcode: { value: cleanSearchNoSpace, boost: 6 },
//           },
//         },
//         {
//           prefix: {
//             unit: { value: cleanSearchNoSpace, boost: 5 },
//           },
//         },
//       );
//     }

//     // 3️⃣ Street / Name Partial Search
//     shouldQueries.push({
//       match_phrase_prefix: {
//         name: { query: rawSearch, boost: 2 },
//       },
//     });

//     const response = await client.search({
//       index: "addresses",
//       size: 50, // Reduced from 100 for fast network transfer
//       query: {
//         bool: {
//           should: shouldQueries,
//           minimum_should_match: 1,
//         },
//       },
//     });

//     const hits = response.hits.hits;

//     // 🧹 High Performance $O(N)$ Deduplication via Map
//     const uniqueMap = new Map();
//     for (let i = 0; i < hits.length; i++) {
//       const source = hits[i]._source;
//       const key = `${source.name}_${source.postcode}`;
//       if (!uniqueMap.has(key)) {
//         uniqueMap.set(key, {
//           name: source.name,
//           postcode: source.postcode,
//           lat: source.lat,
//           lon: source.lon,
//         });
//       }
//     }

//     res.status(200).json(Array.from(uniqueMap.values()));
//   } catch (err) {
//     console.error("❌ Address search failed:", err);
//     res.status(500).json({ message: "Search failed" });
//   }
// };

/////////////////////////////// SEARCH LOCATION WITH POSTCODE EXACT IN ORDER WISE SORTING ///////////////////////////////
// const searchAddresses = async (req, res) => {
//   try {
//     const rawSearch = (req.query.search || "").trim();
//     if (!rawSearch) return res.status(200).json([]);

//     const search = rawSearch.toUpperCase();
//     const cleanSearchNoSpace = search.replace(/\s+/g, "");

//     const isPostcodeLike = /^[A-Z]{1,2}\d{0,2}[A-Z]?\s*\d?[A-Z]{0,2}$/i.test(search);

//     const shouldQueries = [
//       {
//         match_phrase: {
//           postcode: { query: search, boost: 10 }
//         }
//       },
//       {
//         match_phrase: {
//           unit: { query: search, boost: 8 }
//         }
//       }
//     ];

//     if (isPostcodeLike) {
//       shouldQueries.push(
//         {
//           prefix: {
//             postcode: { value: cleanSearchNoSpace, boost: 6 }
//           }
//         },
//         {
//           prefix: {
//             unit: { value: cleanSearchNoSpace, boost: 5 }
//           }
//         }
//       );
//     }

//     shouldQueries.push({
//       match_phrase_prefix: {
//         name: { query: rawSearch, boost: 2 }
//       }
//     });

//     const response = await client.search({
//       index: "addresses",
//       size: 100,
//       query: {
//         bool: {
//           should: shouldQueries,
//           minimum_should_match: 1
//         }
//       }
//     });

//     const hits = response.hits.hits;

//     // Deduplication via Map
//     const uniqueMap = new Map();
//     for (let i = 0; i < hits.length; i++) {
//       const source = hits[i]._source;
//       const key = `${source.name}_${source.postcode}`;
//       if (!uniqueMap.has(key)) {
//         uniqueMap.set(key, {
//           name: source.name,
//           postcode: source.postcode,
//           lat: source.lat,
//           lon: source.lon
//         });
//       }
//     }

//     // 🚀 Natural Numeric Sorting (FLAT 1, FLAT 2, FLAT 3 ... FLAT 10, FLAT 11)
//     const sortedResults = Array.from(uniqueMap.values()).sort((a, b) => {
//       return (a.name || "").localeCompare((b.name || ""), undefined, {
//         numeric: true,
//         sensitivity: "base"
//       });
//     });

//     res.status(200).json(sortedResults);
//   } catch (err) {
//     console.error("❌ Address search failed:", err);
//     res.status(500).json({ message: "Search failed" });
//   }
// };

/////////////////////////////// SEARCH LOCATION WITH POSTCODE EXACT IN ORDER WISE SORTING WITH SPECIFIC FLAT NUMBER EXTRACTION ///////////////////////////////
const searchAddresses = async (req, res) => {
  try {
    const rawSearch = (req.query.search || "").trim();
    if (!rawSearch) return res.status(200).json([]);

    // 1️⃣ Search Term parsing (Extract Number & Postcode)
    // Matches numbers like 24, 49, 10A, Flat 12, etc.
    const numberMatch = rawSearch.match(/\b\d+[a-zA-Z]?\b/);
    const extractedNumber = numberMatch ? numberMatch[0] : null;

    // Postcode pattern match (e.g. TN37 7DN or TN37)
    const postcodeMatch = rawSearch.match(
      /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d?[A-Z]{2}/i,
    );
    const extractedPostcode = postcodeMatch
      ? postcodeMatch[0].toUpperCase()
      : null;

    const shouldQueries = [];
    const mustQueries = [];

    // 2️⃣ Agar User ne Postcode + House Number dono dale hain (e.g. "TN37 7DN 24")
    if (extractedNumber && extractedPostcode) {
      // Must match exact postcode
      mustQueries.push({
        match_phrase: {
          postcode: { query: extractedPostcode },
        },
      });

      // Must match building/house number inside name field
      mustQueries.push({
        match_phrase_prefix: {
          name: { query: extractedNumber },
        },
      });
    } else {
      // 3️⃣ Normal Combined Search (Postcode, Name or Prefix)
      const search = rawSearch.toUpperCase();
      const cleanSearchNoSpace = search.replace(/\s+/g, "");
      const isPostcodeLike = /^[A-Z]{1,2}\d{0,2}[A-Z]?\s*\d?[A-Z]{0,2}$/i.test(
        search,
      );

      shouldQueries.push(
        { match_phrase: { postcode: { query: search, boost: 10 } } },
        { match_phrase: { unit: { query: search, boost: 8 } } },
      );

      if (isPostcodeLike) {
        shouldQueries.push(
          { prefix: { postcode: { value: cleanSearchNoSpace, boost: 6 } } },
          { prefix: { unit: { value: cleanSearchNoSpace, boost: 5 } } },
        );
      }

      shouldQueries.push({
        match_phrase_prefix: {
          name: { query: rawSearch, boost: 2 },
        },
      });
    }

    // Elasticsearch Query Building
    const queryBody =
      mustQueries.length > 0
        ? { bool: { must: mustQueries } }
        : { bool: { should: shouldQueries, minimum_should_match: 1 } };

    const response = await client.search({
      index: "addresses",
      size: 50,
      query: queryBody,
    });

    const hits = response.hits.hits;

    // Map through Unique Entries
    const uniqueMap = new Map();
    for (let i = 0; i < hits.length; i++) {
      const source = hits[i]._source;
      const key = `${source.name}_${source.postcode}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          name: source.name,
          postcode: source.postcode,
          lat: source.lat,
          lon: source.lon,
        });
      }
    }

    // Natural Sequence Sorting (1, 2, 10, 24...)
    const sortedResults = Array.from(uniqueMap.values()).sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "", undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    res.status(200).json(sortedResults);
  } catch (err) {
    console.error("❌ Address search failed:", err);
    res.status(500).json({ message: "Search failed" });
  }
};

// Get Lat/Lon by Name + Postcode
const getLatLon = async (req, res) => {
  try {
    const search = req.query.search;

    const lastHyphenIndex = search.lastIndexOf("-");
    if (lastHyphenIndex === -1) {
      return res.status(400).json({ message: "Invalid address format" });
    }

    const address = search.substring(0, lastHyphenIndex).trim();
    const postcode = search.substring(lastHyphenIndex + 1).trim();

    const response = await client.search({
      index: "addresses",
      size: 1,
      query: {
        bool: {
          must: [
            { match_phrase: { name: address } },
            { match_phrase: { postcode: postcode } },
          ],
        },
      },
    });

    if (response.hits.hits.length > 0) {
      const { lat, lon } = response.hits.hits[0]._source;
      res.status(200).json({ status: true, lat, lon });
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching Lat/Lon" });
  }
};

module.exports = {
  getAllAddresses,
  searchAddresses,
  getLatLon,
};
