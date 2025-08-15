import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB();
    const { roomId } = await params;
    const room = await Room.findById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Clean up inactive users (more than 5 minutes old)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsersMap = room.activeUsers || new Map();

    for (const [userId, userData] of activeUsersMap.entries()) {
      if (new Date(userData.lastActive) < fiveMinutesAgo) {
        activeUsersMap.delete(userId);
      }
    }

    // If the activeUsers map changed, save the room
    if (activeUsersMap.size !== room.activeUsers.size) {
      room.activeUsers = activeUsersMap;
      await room.save();
    }

    // Calculate active users count
    const activeUsersCount = room.activeUsers ? room.activeUsers.size : 0;

    return NextResponse.json({
      _id: room._id,
      name: room.name,
      lastActive: room.lastActive,
      activeUsersCount: activeUsersCount,
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}
