import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/app/lib/mongodb";
import { Message } from "@/app/lib/models/Message";
import { Room } from "@/app/lib/models/Room";
import { checkRateLimit } from "@/app/lib/rateLimit";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB();
    const messageData = await request.json();
    const { roomId } = await params;
    const headersList = headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

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

    await message.save();
    return NextResponse.json(message);
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
