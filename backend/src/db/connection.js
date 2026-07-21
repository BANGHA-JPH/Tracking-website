import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectDatabase() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not defined in .env');
    console.log('Falling back to local offline mock database mode...');
    global.useDbMock = true;
    return;
  }

  try {
    // Check if password placeholder is still present
    if (MONGODB_URI.includes('<db_password>')) {
      console.warn('WARNING: Your .env file contains the "<db_password>" placeholder.');
      console.warn('Please edit backend/.env and replace "<db_password>" with your actual database user password.');
    }

    const cleanUri = MONGODB_URI.replace('<db_password>', process.env.DB_PASSWORD || '');
    
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('Successfully connected to MongoDB Cluster.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.warn('Initiating OFFLINE mock database tracker system...');
    global.useDbMock = true;
  }
}
