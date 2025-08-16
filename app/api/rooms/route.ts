import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";
import { checkRateLimit } from "@/app/lib/rateLimit";
import { verifyCaptcha } from "@/app/lib/captcha";

export async function POST(request: Request) {
  try {
    await connectDB();
    const {
      name,
      creatorId,
      isPrivate = false,
      captchaToken,
    } = await request.json();
    console.log("Received request:", {
      name,
      creatorId,
      isPrivate,
      captchaTokenLength: captchaToken?.length,
    });

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    console.log("Client IP:", ip);

    // Verify CAPTCHA
    console.log("Verifying CAPTCHA token...");
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    console.log("CAPTCHA validation result:", isCaptchaValid);

    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Invalid CAPTCHA. Please try again." },
        { status: 400 }
      );
    }

    // Rate limit: 5 room creations per hour per user
    const rateLimitResponse = await checkRateLimit(
      `create-room:${creatorId}`,
      60 * 60 * 1000, // 1 hour window
      5, // max 5 rooms per hour
      ip // Include IP for rate limiting
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
      isPrivate,
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

export async function GET(request: Request) {
  try {
    await connectDB();

    // Get userId from query parameters to filter private rooms
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    let rooms;
    if (userId) {
      // Show public rooms + private rooms created by this user
      rooms = await Room.find({
        $or: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }],
      })
        .select("name isPrivate creatorId lastActive")
        .sort({ lastActive: -1 });
    } else {
      // Only show public rooms if no userId provided
      rooms = await Room.find({ isPrivate: false })
        .select("name isPrivate lastActive")
        .sort({ lastActive: -1 });
    }

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
