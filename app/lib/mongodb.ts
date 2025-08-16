import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp";

// Optimized connection options for serverless environments
const connectionOptions = {
  // Connection pool settings for serverless
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  // Buffering settings
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0, // Disable mongoose buffering
  // Heartbeat frequency for faster detection of connection issues
  heartbeatFrequencyMS: 10000,
  // Connection timeout
  connectTimeoutMS: 10000,
};

// Global cached connection for serverless optimization
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    console.log("🔄 Using cached MongoDB connection");
    return cached.conn;
  }

  // Return pending connection promise if exists
  if (cached.promise) {
    console.log("⏳ Waiting for pending MongoDB connection...");
    cached.conn = await cached.promise;
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI environment variable is not defined");
  }

  try {
    console.log("🔌 Creating new MongoDB connection...");

    // Create new connection with optimized options
    cached.promise = mongoose.connect(MONGODB_URI, connectionOptions);

    cached.conn = await cached.promise;

    console.log("✅ MongoDB connected successfully");

    // Set up connection event listeners for better monitoring
    mongoose.connection.on("connected", () => {
      console.log("📡 MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      // Reset cache on error
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📴 MongoDB disconnected");
      // Reset cache on disconnection
      cached.conn = null;
      cached.promise = null;
    });

    // Handle process termination gracefully
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log("🔒 MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        console.error("❌ Error closing MongoDB connection:", err);
        process.exit(1);
      }
    });

    return cached.conn;
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    // Reset cache on error
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}

// Export both the connection function and a helper to check connection status
export default connectDB;

export const isConnected = (): boolean => {
  return cached.conn !== null && mongoose.connection.readyState === 1;
};

export const getConnectionState = (): string => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return (
    states[mongoose.connection.readyState as keyof typeof states] || "unknown"
  );
};
