const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  max: 20,
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
  connectionTimeoutMillis: 30000,
  ssl: false, // Disable SSL for local development
  keepAlive: true,
  idleTimeoutMillis: 30000
});

// Test the connection
pool.connect()
  .then(client => {
    console.log('Successfully connected to database');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
    console.error('Connection details:', {
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'postgres',
      database: process.env.PGDATABASE,
      port: process.env.PGPORT || 5432
    });
    process.exit(1);
  });

module.exports = pool;