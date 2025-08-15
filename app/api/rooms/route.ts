import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { name, creatorId } = await request.json();

    // Validate room name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    // Check if user has reached room limit
    const userRooms = await Room.countDocuments({ creatorId });
    if (userRooms >= 10) {
      return NextResponse.json(
        { error: "You have reached the maximum limit of 10 rooms" },
        { status: 400 }
      );
    }

    const room = new Room({
      name: name.trim().substring(0, 20),
      creatorId,
      isPrivate: false,
      inviteLinks: [],
    });

    await room.save();
    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const rooms = await Room.find()
      .select("name isPrivate lastActive")
      .sort({ lastActive: -1 });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
