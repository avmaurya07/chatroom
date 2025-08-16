import { NextResponse } from "next/server";
import connectDB, { isConnected, getConnectionState } from "@/app/lib/mongodb";
import mongoose from "mongoose";

export async function GET() {
  try {
    const startTime = Date.now();

    // Try to connect to MongoDB
    await connectDB();

    const connectionTime = Date.now() - startTime;

    // Get detailed connection information
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: isConnected(),
        connectionState: getConnectionState(),
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        connectionTime: `${connectionTime}ms`,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };

    return NextResponse.json(healthStatus, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);

    const healthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      mongodb: {
        connected: false,
        connectionState: getConnectionState(),
        readyState: mongoose.connection.readyState,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };

    return NextResponse.json(healthStatus, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
