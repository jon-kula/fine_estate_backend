// Test database connection
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.wxrghgcdqctzyyeqrkqm:Oaktree1998%21@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Connection successful:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();