// src/config/database.js
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Connection options
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 5 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10, // Maximum number of connections in the connection pool
  minPoolSize: 1, // Minimum number of connections in the connection pool
  connectTimeoutMS: 10000, // 10 seconds to connect
  heartbeatFrequencyMS: 10000, // Send a heartbeat every 10 seconds
  retryWrites: true,
  w: 'majority'
};

// Handle MongoDB connection events
function setupMongoEventHandlers(mongooseConnection) {
  
  mongooseConnection.on('connected', () => {
    const { host, port, name } = mongoose.connection;
    logger.info(`✅ MongoDB Connected: ${host}:${port}/${name}`);
    console.log('✅ MongoDB Connected Successfully!');
  });

  mongooseConnection.on('error', (err) => {
    logger.error(`❌ MongoDB Connection Error: ${err.message}`);
    console.error('❌ MongoDB Connection Error:', err.message);
  });

  mongooseConnection.on('disconnected', () => {
    logger.warn('⚠️  MongoDB Disconnected');
    console.log('⚠️  MongoDB Disconnected');
  });

  mongooseConnection.on('reconnected', () => {
    logger.info('♻️  MongoDB Reconnected');
    console.log('♻️  MongoDB Reconnected');
  });

  mongooseConnection.on('reconnectFailed', () => {
    logger.error('❌ MongoDB Reconnection Failed');
    console.error('❌ MongoDB Reconnection Failed');
  });
}

// Connect to MongoDB
export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      const error = new Error('❌ MONGODB_URI is not defined in environment variables');
      console.error(error.message);
      logger.error(error.message);
      process.exit(1);
    }

    logger.info('🔌 Attempting to connect to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    
    // Setup event handlers
    setupMongoEventHandlers(mongoose.connection);
    
    logger.info(`✅ Connected to MongoDB`);
    
    return conn;
  } catch (error) {
    const errorMsg = `❌ MongoDB connection error: ${error.message}`;
    logger.error(errorMsg);
    console.error(errorMsg);
    process.exit(1);
  }
};

// Graceful shutdown
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    console.log('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

export default { connectDB, closeDB };