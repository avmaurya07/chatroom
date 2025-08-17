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

    // Ensure activeUsers exists
    if (!room.activeUsers) {
      room.activeUsers = new Map();
      await room.save();
    }

    // Clean up inactive users (more than 5 minutes old)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsersMap = new Map(room.activeUsers);

    try {
      for (const [userId, userData] of activeUsersMap.entries()) {
        // Define the type for userData
        const typedUserData = userData as {
          userId?: string;
          userName?: string;
          userEmoji?: string;
          lastActive?: Date | string;
        };

        if (
          typedUserData &&
          typedUserData.lastActive &&
          new Date(typedUserData.lastActive) < fiveMinutesAgo
        ) {
          activeUsersMap.delete(userId);
        }
      }

      // Only save if there were changes
      if (activeUsersMap.size !== room.activeUsers.size) {
        room.activeUsers = activeUsersMap;
        await room.save();
      }
    } catch (error) {
      console.error("Error processing active users:", error);
      // Reset the activeUsers map if there's an error
      room.activeUsers = new Map();
      await room.save();
    }

    // Calculate active users count safely
    const activeUsersCount = room.activeUsers ? room.activeUsers.size : 0;

    return NextResponse.json({
      _id: room._id,
      name: room.name,
      lastActive: room.lastActive,
      activeUsersCount: activeUsersCount,
      isPrivate: room.isPrivate,
      isPersonal: room.isPersonal,
      p1: room.p1,
      p2: room.p2,
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}
