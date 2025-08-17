import { NextResponse, NextRequest } from "next/server";
import redis from "@/app/lib/redis";

// Store active SSE subscribers
const roomSubscribers: Record<
  string,
  Set<ReadableStreamDefaultController>
> = {};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> | { roomId: string } }
) {
  try {
    // Handle both Promise-based and direct params
    const params =
      context.params instanceof Promise ? await context.params : context.params;
    const { roomId } = params;
    const streamKey = `room:${roomId}:stream`;

    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };

    const encoder = new TextEncoder();

    const sendEvent = (
      controller: ReadableStreamDefaultController,
      data: unknown,
      eventType = ""
    ) => {
      const eventData = typeof data === "string" ? data : JSON.stringify(data);
      let eventString = "";
      if (eventType) eventString += `event: ${eventType}\n`;
      const dataLines = eventData.split("\n");
      for (const line of dataLines) eventString += `data: ${line}\n`;
      eventString += "\n";
      controller.enqueue(encoder.encode(eventString));
    };

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        sendEvent(
          controller,
          { type: "connection", status: "connected", timestamp: Date.now() },
          "connection"
        );

        // Register subscriber
        if (!roomSubscribers[roomId]) roomSubscribers[roomId] = new Set();
        roomSubscribers[roomId].add(controller);

        console.log(
          `Client connected to room: ${roomId}, total: ${roomSubscribers[roomId].size}`
        );

        // Ping interval
        const pingInterval = setInterval(() => {
          sendEvent(
            controller,
            { type: "ping", timestamp: Date.now() },
            "ping"
          );
        }, 15000);

        request.signal.addEventListener("abort", () => {
          console.log("Client disconnected from SSE:", roomId);
          roomSubscribers[roomId].delete(controller);
          clearInterval(pingInterval);
        });
      },
    });

    // Subscribe to Redis channel
    try {
      await redis.subscribe(`${streamKey}:pubsub`);
      console.log(`Subscribed to ${streamKey}:pubsub`);

      if ("onMessage" in redis) {
        const mockRedis = redis as {
          onMessage: (
            callback: (channel: string, message: string) => void
          ) => void;
        };
        mockRedis.onMessage((channel: string, message: string) => {
          if (!roomSubscribers[roomId]) return;
          if (channel !== `${streamKey}:pubsub`) return;

          const redisData = JSON.parse(message);
          console.log("Received redis message:", redisData);
          for (const controller of roomSubscribers[roomId]) {
            try {
              // For debugging, log what we're sending
              console.log("Sending to client:", redisData.message || redisData);
              // Try both formats - sometimes the message might be directly in redisData
              sendEvent(controller, redisData.message || redisData, "message");
            } catch (err) {
              console.error("Failed to send message to subscriber:", err);
            }
          }
        });
      }
    } catch (err) {
      console.error("Failed to subscribe to Redis channel:", err);
    }

    return new Response(stream, { headers });
  } catch (err) {
    console.error("SSE error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
