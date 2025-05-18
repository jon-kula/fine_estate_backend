const { Client } = require('pg');
require('dotenv').config();

async function test() {
  // Let's try the session pooler (IPv4 compatible)
  const connectionString = 'postgresql://postgres.qutuqjapsjyooekfobbs:YXN%40mek_ate3run7xpz@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
  
  console.log('Testing connection...');
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected!');
    const result = await client.query('SELECT NOW()');
    console.log('Time from DB:', result.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

test();