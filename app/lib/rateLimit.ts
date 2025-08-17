import { NextResponse } from "next/server";
import redis from "./redis";

interface RateLimitInfo {
  isLimited: boolean;
  remainingRequests: number;
  msBeforeNext: number;
}

export async function getRateLimitInfo(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitInfo> {
  try {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;

    // Use MULTI/EXEC for atomic operations
    const count = await redis.incr(windowKey);

    // Set expiration if this is a new window
    if (count === 1) {
      await redis.expire(windowKey, Math.ceil(windowMs / 1000)); // Convert ms to seconds for expire
    }

    const ttl = await redis.pttl(windowKey);
    const currentCount = typeof count === "number" ? count : 0;
    const currentTtl = typeof ttl === "number" ? ttl : 0;

    const isLimited = currentCount > maxRequests;
    const remainingRequests = Math.max(0, maxRequests - currentCount);
    const msBeforeNext = isLimited ? currentTtl : 0;

    return {
      isLimited,
      remainingRequests,
      msBeforeNext,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // In case of Redis error, don't rate limit the user
    return {
      isLimited: false,
      remainingRequests: maxRequests,
      msBeforeNext: 0,
    };
  }
}

export async function checkRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number,
  ip?: string
): Promise<NextResponse | null> {
  try {
    // If IP is provided, also check IP-based rate limit
    if (ip) {
      const ipLimitInfo = await getRateLimitInfo(
        `ip:${ip}`,
        60 * 1000, // 1 minute window for IP
        60 // max 60 requests per minute per IP
      );

      if (ipLimitInfo.isLimited) {
        return NextResponse.json(
          {
            error: "Too many requests from this IP",
            retryAfter: Math.ceil(ipLimitInfo.msBeforeNext / 1000),
          },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(
                ipLimitInfo.msBeforeNext / 1000
              ).toString(),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }

    // Check user/action specific rate limit
    const limitInfo = await getRateLimitInfo(key, windowMs, maxRequests);

    if (limitInfo.isLimited) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil(limitInfo.msBeforeNext / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(limitInfo.msBeforeNext / 1000).toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    return null;
  } catch (error) {
    console.error("Rate limit check error:", error);
    // In case of an error, don't rate limit the user
    return null;
  }
}
