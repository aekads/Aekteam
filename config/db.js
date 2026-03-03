// config/db.js
const { Pool } = require('pg');

require("dotenv").config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Render
  },
});


module.exports = pool;



