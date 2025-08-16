import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, userName, userEmoji } = await request.json();

    // Prevent impersonation of admin
    if (userName.toLowerCase() === "avmaurya07") {
      return NextResponse.json(
        { error: "This username is reserved" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      userId,
      userName,
      userEmoji,
    });
  } catch (err) {
    console.error("Failed to validate user:", err);
    return NextResponse.json(
      { error: "Failed to validate user" },
      { status: 500 }
    );
  }
}
