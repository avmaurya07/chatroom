import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { userId1, userId2, userName1, userName2, userEmoji1, userEmoji2 } =
      await request.json();

    if (
      !userId1 ||
      !userId2 ||
      !userName1 ||
      !userName2 ||
      !userEmoji1 ||
      !userEmoji2
    ) {
      return NextResponse.json(
        { error: "User IDs, names, and emojis are required" },
        { status: 400 }
      );
    }

    // Check if a personal room already exists between these users
    const existingRoom = await Room.findOne({
      isPersonal: true,
      $or: [
        { "p1.id": userId1, "p2.id": userId2 },
        { "p1.id": userId2, "p2.id": userId1 },
      ],
    });

    if (existingRoom) {
      return NextResponse.json({ roomId: existingRoom._id });
    }

    // Create new personal room
    const newRoom = new Room({
      name: `${userEmoji1} ${userName1} & ${userEmoji2} ${userName2}`,
      creatorId: userId1,
      isPrivate: true,
      isPersonal: true,
      p1: {
        id: userId1,
        name: userName1,
        emoji: userEmoji1,
      },
      p2: {
        id: userId2,
        name: userName2,
        emoji: userEmoji2,
      },
      activeUsers: {
        [userId1]: {
          userId: userId1,
          userName: userName1,
          userEmoji: userEmoji1,
          lastActive: new Date(),
        },
        [userId2]: {
          userId: userId2,
          userName: userName2,
          userEmoji: userEmoji2,
          lastActive: new Date(),
        },
      },
    });

    await newRoom.save();
    return NextResponse.json({ roomId: newRoom._id });
  } catch (error) {
    console.error("Error creating personal room:", error);
    return NextResponse.json(
      { error: "Failed to create personal room" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find all personal rooms for the user
    const rooms = await Room.find({
      isPersonal: true,
      $or: [{ "p1.id": userId }, { "p2.id": userId }],
    }).sort({ lastActive: -1 });

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Error fetching personal rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch personal rooms" },
      { status: 500 }
    );
  }
}
