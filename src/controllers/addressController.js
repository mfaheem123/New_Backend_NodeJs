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

// SEARCH LOCATION WITH POSTCODE EXACT
const searchAddresses = async (req, res) => {
  try {
    const rawSearch = req.query.search.trim();
    const search = rawSearch.toUpperCase();

    // 🧠 Detect if input is a postcode or prefix of one
    const isPostcodeLike = /^[A-Z]{1,2}\d{0,2}[A-Z]?\s*\d?[A-Z]{0,2}$/i.test(
      search
    );

    const response = await client.search({
      index: "addresses",
      size: 100,
      query: {
        bool: {
          should: [
            // 1️⃣ Exact postcode match (for full postcodes)
            {
              match_phrase: {
                postcode: {
                  query: search,
                  boost: 10,
                },
              },
            },
            {
              match_phrase: {
                unit: {
                  query: search,
                  boost: 8,
                },
              },
            },

            // 2️⃣ Partial postcode prefix search (TN / TN3 / TN37 / TN37 6)
            ...(isPostcodeLike
              ? [
                  {
                    wildcard: {
                      postcode: {
                        value: `${search.replace(/\s/g, "")}*`,
                        boost: 6,
                      },
                    },
                  },
                  {
                    wildcard: {
                      unit: {
                        value: `${search.replace(/\s/g, "")}*`,
                        boost: 5,
                      },
                    },
                  },
                ]
              : []),

            // 3️⃣ Street or building name fallback
            {
              match_phrase_prefix: {
                name: {
                  query: rawSearch,
                  boost: 2,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const hits = response.hits.hits.map((h) => h._source);

    // 🧹 Clean duplicates
    const unique = hits.filter(
      (v, i, a) =>
        a.findIndex((t) => t.name === v.name && t.postcode === v.postcode) === i
    );

    res.status(200).json(unique);
  } catch (err) {
    console.error("Address search failed:", err);
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
