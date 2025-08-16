import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

// Function to remove inactive users (those who haven't updated in last 30 seconds)
interface RoomActiveUser {
  userId: string;
  userName: string;
  userEmoji: string;
  lastActive: Date;
}

interface RoomDocument {
  activeUsers: Map<string, RoomActiveUser>;
  save: () => Promise<void>;
}

async function cleanupInactiveUsers(room: RoomDocument) {
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000); // 30 seconds inactivity threshold
  const activeUsersMap = new Map(room.activeUsers);
  let hasChanges = false;

  for (const [userId, userData] of activeUsersMap.entries()) {
    const typedUserData = userData as {
      lastActive?: Date | string;
    };

    if (
      !typedUserData?.lastActive ||
      new Date(typedUserData.lastActive) < thirtySecondsAgo
    ) {
      activeUsersMap.delete(userId);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    room.activeUsers = activeUsersMap;
    await room.save();
  }

  return Array.from(room.activeUsers.values());
}

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

    // First cleanup inactive users
    await cleanupInactiveUsers(room);

    // Then update current user's activity
    room.activeUsers.set(userId, {
      userId,
      userName,
      userEmoji,
      lastActive: new Date(),
    });

    await room.save();

    // Get final list of active users after all updates
    const activeUsers = Array.from(room.activeUsers.values());

    return NextResponse.json({
      success: true,
      activeUsers,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating user activity:", error);
    return NextResponse.json(
      { error: "Failed to update user activity" },
      { status: 500 }
    );
  }
}
