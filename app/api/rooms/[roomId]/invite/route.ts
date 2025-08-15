import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB();
    const { code, isOneTime } = await request.json();
    const { roomId } = await params;
    const room = await Room.findById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    room.inviteLinks.push({
      code,
      isOneTime,
      usedBy: [],
      createdAt: new Date(),
    });

    await room.save();
    return NextResponse.json(room.inviteLinks[room.inviteLinks.length - 1]);
  } catch (error) {
    console.error("Failed to create invite link:", error);
    return NextResponse.json(
      { error: "Failed to create invite link" },
      { status: 500 }
    );
  }
}
