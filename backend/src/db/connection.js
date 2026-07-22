import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectDatabase() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not defined in .env');
    return;
  }

  try {
    const cleanUri = MONGODB_URI.replace('<db_password>', process.env.DB_PASSWORD || '');
    
    console.log('Connecting to MongoDB Atlas Cluster...');

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection lost. Reconnecting...');
    });

    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('Successfully connected to MongoDB Cluster (Database: ups_portal).');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}
