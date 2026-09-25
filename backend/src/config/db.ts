// 7 Vachan - MongoDB connection setup (Mongoose)
// SETUP STUB ONLY — no models/business logic yet, per project rules.

import mongoose from "mongoose";
import dns from "dns";

// Windows sometimes ignores system DNS settings for Node's SRV lookups
// (used by mongodb+srv:// URIs), causing ECONNREFUSED even when the
// system resolver (nslookup) works fine. Forcing Google DNS here fixes it reliably.
//
// This is process-wide (every later DNS lookup, not just Mongo's), and some
// networks block outbound DNS to public resolvers — containers with an internal
// resolver, corporate networks, private-endpoint Atlas. There the override is
// what breaks resolution, so DISABLE_PUBLIC_DNS_OVERRIDE=true skips it and
// leaves the system resolver in charge. Default stays "override" because that
// is what makes mongodb+srv:// work on the dev machines this was written for.
//
// Read inside connectDB(), not at module load: server.ts imports this file
// before it calls dotenv.config(), so a top-level read would never see .env.
export async function connectDB(): Promise<void> {
  if (process.env.DISABLE_PUBLIC_DNS_OVERRIDE !== "true") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vachan_dev";

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    console.error("   Backend will keep running, but DB-dependent routes will fail.");
    console.error("   Make sure MongoDB is running and MONGODB_URI is set correctly in backend/.env");
  }
}

export default connectDB;