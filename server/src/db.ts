import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in environment');
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('Connected to MongoDB');
}

export function getDb(): Db {
  if (!db) throw new Error('DB not connected — call connectDB() first');
  return db;
}
