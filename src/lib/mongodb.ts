import mongoose from 'mongoose';

const isProd = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || (isProd ? '' : 'mongodb://localhost:27017/pool-championship');

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
  if (isProd && !process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in production');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
