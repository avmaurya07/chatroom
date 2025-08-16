import { NextResponse } from "next/server";
import crypto from "crypto";

const SECRET_KEY = process.env.USER_AUTH_SECRET || "your-secret-key-here"; // Make sure to set this in your environment variables

// Function to create a signature
function createSignature(
  userId: string,
  userName: string,
  userEmoji: string
): string {
  const data = `${userId}:${userName}:${userEmoji}`;
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

// Function to verify a signature
function verifySignature(
  userId: string,
  userName: string,
  userEmoji: string,
  signature: string
): boolean {
  const expectedSignature = createSignature(userId, userName, userEmoji);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const {
      userId,
      userName,
      userEmoji,
      signature: existingSignature,
    } = await request.json();

    // Prevent impersonation of admin
    if (userName.toLowerCase() === "avmaurya07") {
      return NextResponse.json(
        { error: "This username is reserved" },
        { status: 403 }
      );
    }

    // Verify existing signature if provided
    if (
      existingSignature &&
      !verifySignature(userId, userName, userEmoji, existingSignature)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Create a new signature for the user info
    const signature = createSignature(userId, userName, userEmoji);

    return NextResponse.json({
      userId,
      userName,
      userEmoji,
      signature,
    });
  } catch (err) {
    console.error("Failed to validate user:", err);
    return NextResponse.json(
      { error: "Failed to validate user" },
      { status: 500 }
    );
  }
}
