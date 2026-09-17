import mongoose from "mongoose";

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI inside .env.local");
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
