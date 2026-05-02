import mongoose from 'mongoose';

const isProd = process.env.NODE_ENV === 'production';

// Try to get MONGODB_URI from multiple sources
let MONGODB_URI = process.env.MONGODB_URI;

// Log environment variable status in production
if (isProd) {
  console.log('🔍 Production environment detected');
  console.log('MONGODB_URI status:', MONGODB_URI ? '✅ Set' : '❌ Not set');
  
  // Log all env vars that might contain mongo
  const mongoKeys = Object.keys(process.env).filter(k => 
    k.toLowerCase().includes('mongo') || 
    k.toLowerCase().includes('database') ||
    k.toLowerCase().includes('db_')
  );
  if (mongoKeys.length > 0) {
    console.log('Found related env vars:', mongoKeys);
  }
}

// Fallback for non-production
if (!MONGODB_URI && !isProd) {
  MONGODB_URI = 'mongodb://localhost:27017/pool-championship';
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache = globalCache.mongoose ?? { conn: null, promise: null };
globalCache.mongoose = cached;

async function dbConnect() {
  if (isProd && !MONGODB_URI) {
    const err = new Error('MONGODB_URI environment variable is not set in production');
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }

  if (cached.conn) {
    console.log('[dbConnect] Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    };

    const mongoUri = MONGODB_URI || '';
    const uriPreview = mongoUri.replace(/:[^:]*@/, ':***@');
    console.log(`[dbConnect] Initiating MongoDB connection to: ${uriPreview}`);
    
    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      console.log('[dbConnect] ✅ MongoDB connected successfully');
      return mongoose;
    }).catch((err) => {
      console.error('[dbConnect] ❌ MongoDB connection error:', err.message);
      console.error('[dbConnect] Error details:', err);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[dbConnect] Connection attempt failed, cleared promise');
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
