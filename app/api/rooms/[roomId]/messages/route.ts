import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/app/lib/mongodb";
import { Message } from "@/app/lib/models/Message";
import { Room } from "@/app/lib/models/Room";
import { checkRateLimit } from "@/app/lib/rateLimit";
import redis from "@/app/lib/redis";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB();
    const { roomId } = await params;
    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(100);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

import { verifyUserData, isReservedUsername } from "@/app/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB();
    const messageData = await request.json();
    const { roomId } = await params;
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

    // Verify user data and signature
    if (!verifyUserData(messageData)) {
      return NextResponse.json(
        { error: "Invalid user signature" },
        { status: 403 }
      );
    }

    // Check for reserved usernames
    if (isReservedUsername(messageData.userName)) {
      return NextResponse.json(
        { error: "This username is reserved" },
        { status: 403 }
      );
    }

    // Rate limit: 30 messages per minute per user per room
    const rateLimitResponse = await checkRateLimit(
      `send-message:${messageData.userId}:${roomId}`,
      60 * 1000, // 1 minute window
      30, // max 30 messages per minute
      ip
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Update room's lastActive timestamp
    await Room.findByIdAndUpdate(roomId, {
      lastActive: new Date(),
    });

    // Store signature for potential future verification
    const message = new Message({
      ...messageData,
      roomId,
    });

    const savedMessage = await message.save();
    const streamKey = `room:${roomId}:stream`;

    // Store the message in a Redis sorted set with timestamp as score for real-time updates
    const timestamp = new Date(savedMessage.createdAt).getTime();
    await redis.zadd(streamKey, {
      score: timestamp,
      member: JSON.stringify({
        ...savedMessage.toJSON(),
        timestamp,
      }),
    });

    // Set expiration for the stream (e.g., 24 hours)
    await redis.expire(streamKey, 24 * 60 * 60);

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
