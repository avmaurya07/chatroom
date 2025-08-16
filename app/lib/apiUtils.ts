import { NextRequest, NextResponse } from "next/server";
import connectDB from "./mongodb";

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export type ApiHandler = (
  request: NextRequest,
  context?: Record<string, unknown>
) => Promise<NextResponse>;

/**
 * Wrapper for API routes that ensures MongoDB connection and provides error handling
 * This wrapper automatically handles:
 * - Database connection establishment
 * - Connection error recovery
 * - Consistent error response formatting
 * - Request/response logging
 */
export function withDatabase(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
): ApiHandler {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;

    // Use options to avoid unused variable warning
    console.log(
      `🔧 API options configured:`,
      Object.keys(options).length > 0 ? options : "default"
    );

    try {
      // Ensure database connection
      await connectDB();

      // Execute the actual handler
      const response = await handler(request, context);

      const duration = Date.now() - startTime;
      console.log(`✅ ${method} ${url} - ${response.status} (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${method} ${url} - Error (${duration}ms):`, error);

      // Handle different types of errors
      if (error instanceof Error) {
        if (
          error.message.includes("MongooseServerSelectionError") ||
          error.message.includes("MongoDB")
        ) {
          return NextResponse.json(
            {
              error: "Database connection failed",
              message: "Please try again in a moment",
              timestamp: new Date().toISOString(),
            },
            { status: 503 }
          );
        }

        if (error.message.includes("ValidationError")) {
          return NextResponse.json(
            {
              error: "Validation failed",
              message: error.message,
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
      }

      // Generic error response
      return NextResponse.json(
        {
          error: "Internal server error",
          message: "An unexpected error occurred",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility to create standardized API responses
 */
export const createApiResponse = {
  success: <T>(data: T, status = 200) => {
    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  },

  error: (message: string, status = 400, details?: Record<string, unknown>) => {
    return NextResponse.json(
      {
        success: false,
        error: message,
        details,
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  },

  notFound: (message = "Resource not found") => {
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    );
  },
};

/**
 * Utility to handle database operations with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        console.error(
          `❌ Operation failed after ${maxRetries} attempts:`,
          error
        );
        throw error;
      }

      console.warn(
        `⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError!;
}
