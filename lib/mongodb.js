import { MongoClient } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'voting';

// Reuse the connection across hot-reloads (dev) and warm serverless
// invocations (Vercel) instead of opening a new one on every request.
let cached = global._mongo;
if (!cached) cached = global._mongo = { client: null, promise: null, indexed: false };

async function ensureIndexes(db) {
  if (cached.indexed) return;
  await Promise.all([
    db.collection('polls').createIndex({ slug: 1 }, { unique: true }),
    db.collection('participants').createIndex(
      { pollId: 1, usernameLower: 1 },
      { unique: true }
    ),
  ]);
  cached.indexed = true;
}

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI environment variable');

  if (!cached.promise) {
    cached.promise = new MongoClient(uri).connect();
  }
  if (!cached.client) {
    cached.client = await cached.promise;
  }
  const db = cached.client.db(dbName);
  await ensureIndexes(db);
  return db;
}
