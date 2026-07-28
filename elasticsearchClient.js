const { Client } = require("@elastic/elasticsearch");
require("dotenv").config();

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || "https://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USERNAME || "elastic",
    password: process.env.ELASTIC_PASSWORD || "your_password_here",
  },
  tls: {
    rejectUnauthorized: false, // self-signed cert ke liye
  },
});

module.exports = client;
