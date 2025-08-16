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

import { isReservedUsername } from "@/app/lib/auth";

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

    const message = new Message({
      ...messageData,
      roomId,
    });

    const savedMessage = await message.save();
    const streamKey = `room:${roomId}:stream`;

    // Store the message in a Redis list for SSE polling
    // Using timestamp to track message order
    const redisMessageEntry = {
      timestamp: Date.now(),
      message: savedMessage.toJSON(),
    };

    try {
      // Make sure we're saving a proper JSON string
      const serializedEntry = JSON.stringify(redisMessageEntry);
      console.log(
        `Saving message to Redis: ${serializedEntry.substring(0, 100)}...`
      );

      // Add to recent messages list (limit to 50)
      await redis.lpush(`${streamKey}:recent`, serializedEntry);
      await redis.ltrim(`${streamKey}:recent`, 0, 49);

      // Publish the message to Redis PubSub for immediate delivery
      const pubSubKey = `${streamKey}:pubsub`;
      await redis.publish(pubSubKey, serializedEntry);

      console.log(`Published message to ${pubSubKey}`);
    } catch (redisError) {
      console.error("Redis error:", redisError);
      // Even if Redis fails, we can still return the saved message
    }
    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
