// Test Supabase connection with different configurations
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Test 1: Direct connection (no pooler)
async function testDirectConnection() {
  console.log('Test 1: Direct connection...');
  const pool = new Pool({
    host: 'db.qutuqjapsjyooekfobbs.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Oaktree1998!',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Direct connection successful:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Direct connection error:', err.message);
  } finally {
    await pool.end();
  }
}

// Test 2: Pooler connection 
async function testPoolerConnection() {
  console.log('\nTest 2: Pooler connection...');
  const pool = new Pool({
    connectionString: 'postgresql://postgres.qutuqjapsjyooekfobbs:Oaktree1998!@aws-0-us-east-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Pooler connection successful:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Pooler connection error:', err.message);
  } finally {
    await pool.end();
  }
}

// Test 3: Supabase client
async function testSupabaseClient() {
  console.log('\nTest 3: Supabase client...');
  const supabaseUrl = 'https://wxrghgcdqctzyyeqrkqm.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Supabase client error:', error.message);
    } else {
      console.log('Supabase client successful:', data);
    }
  } catch (err) {
    console.error('Supabase client error:', err.message);
  }
}

async function runTests() {
  await testDirectConnection();
  await testPoolerConnection();
  await testSupabaseClient();
}

runTests();