import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const { userId, userName, userEmoji } = await request.json();

    await connectDB();
    const room = await Room.findById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Update user's activity in the room
    room.activeUsers.set(userId, {
      userId,
      userName,
      userEmoji,
      lastActive: new Date(),
    });

    await room.save();

    return NextResponse.json({
      success: true,
      activeUsers: Array.from(room.activeUsers.values()),
    });
  } catch (error) {
    console.error("Error updating user activity:", error);
    return NextResponse.json(
      { error: "Failed to update user activity" },
      { status: 500 }
    );
  }
}
