// Example of how to refactor your existing API routes to use the optimized MongoDB connection

import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { Room } from "@/app/lib/models/Room";
import { checkRateLimit } from "@/app/lib/rateLimit";
import { verifyCaptcha } from "@/app/lib/captcha";
import { withDatabase, createApiResponse, withRetry } from "@/app/lib/apiUtils";

// Original handler function (without database connection logic)
async function createRoomHandler(request: NextRequest) {
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
    return createApiResponse.error("Invalid CAPTCHA. Please try again.", 400);
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

  // Validation
  if (!name || !creatorId) {
    return createApiResponse.error("Name and creatorId are required", 400);
  }

  if (name.length < 1 || name.length > 50) {
    return createApiResponse.error(
      "Room name must be between 1 and 50 characters",
      400
    );
  }

  if (creatorId.length < 1 || creatorId.length > 30) {
    return createApiResponse.error(
      "Creator ID must be between 1 and 30 characters",
      400
    );
  }

  const sanitizedName = name.trim().replace(/[<>]/g, "");

  try {
    // Use retry logic for database operations
    const room = await withRetry(async () => {
      return await Room.create({
        name: sanitizedName,
        creatorId,
        isPrivate,
        participants: [creatorId],
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    });

    console.log("✅ Room created successfully:", room._id);

    return createApiResponse.success(
      {
        id: room._id,
        name: room.name,
        creatorId: room.creatorId,
        isPrivate: room.isPrivate,
        participantCount: room.participants.length,
        createdAt: room.createdAt,
      },
      201
    );
  } catch (error) {
    console.error("❌ Error creating room:", error);

    if (error instanceof Error && error.message.includes("duplicate key")) {
      return createApiResponse.error(
        "A room with this name already exists",
        409
      );
    }

    throw error; // Let the wrapper handle this
  }
}

// Export the wrapped handler - this automatically handles database connection
export const POST = withDatabase(createRoomHandler);

// You can also export a GET handler for listing rooms
async function getRoomsHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50); // Max 50 per page
  const isPrivate = searchParams.get("private") === "true";

  try {
    const skip = (page - 1) * limit;

    // Use retry logic for database operations
    const [rooms, total] = await withRetry(async () => {
      return await Promise.all([
        Room.find(isPrivate ? { isPrivate: true } : { isPrivate: false })
          .sort({ lastActivity: -1 })
          .skip(skip)
          .limit(limit)
          .select(
            "name creatorId isPrivate participants createdAt lastActivity"
          )
          .lean(),
        Room.countDocuments(
          isPrivate ? { isPrivate: true } : { isPrivate: false }
        ),
      ]);
    });

    return createApiResponse.success({
      rooms: rooms.map((room) => ({
        id: room._id,
        name: room.name,
        creatorId: room.creatorId,
        isPrivate: room.isPrivate,
        participantCount: room.participants.length,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching rooms:", error);
    throw error; // Let the wrapper handle this
  }
}

export const GET = withDatabase(getRoomsHandler);

/*
Key improvements in this example:

1. ✅ Separated business logic from connection logic
2. ✅ Automatic database connection handling with retry
3. ✅ Consistent error responses using createApiResponse
4. ✅ Built-in error handling and logging
5. ✅ Retry logic for database operations
6. ✅ Clean separation of concerns
7. ✅ TypeScript type safety
8. ✅ Performance monitoring (timing logs)

You can apply this pattern to all your API routes:
- Remove manual `await connectDB()` calls
- Wrap handlers with `withDatabase()`
- Use `createApiResponse` for consistent responses
- Use `withRetry()` for critical database operations
*/
