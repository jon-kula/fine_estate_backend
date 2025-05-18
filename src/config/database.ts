import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Image } from '../entities/Image';
import { ImageVariant } from '../entities/ImageVariant';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // Set to false for production
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Image, ImageVariant],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
  ssl: {
    rejectUnauthorized: false
  },
  extra: {
    ssl: {
      rejectUnauthorized: false
    }
  }
});

export const initializeDatabase = async () => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Log database URL without password for debugging
    const urlParts = dbUrl.split('@');
    const hostPart = urlParts[1] || '';
    console.log('Connecting to database:', hostPart);
    
    await AppDataSource.initialize();
    console.log('Database connection established');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};