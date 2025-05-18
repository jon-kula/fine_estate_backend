import { AppDataSource } from './config/database';

async function testConnection() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await AppDataSource.query('SELECT NOW()');
    console.log('Current time from database:', result[0].now);
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();