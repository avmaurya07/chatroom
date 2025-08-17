import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// We'll store subscribers per room in memory
const roomSubscribers: Record<
  string,
  Set<ReadableStreamDefaultController>
> = {};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const streamKey = `room:${roomId}:stream`;

    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: unknown, eventType = "") => {
          const eventData =
            typeof data === "string" ? data : JSON.stringify(data);
          let eventString = "";
          if (eventType) eventString += `event: ${eventType}\n`;
          const dataLines = eventData.split("\n");
          for (const line of dataLines) eventString += `data: ${line}\n`;
          eventString += "\n";
          controller.enqueue(encoder.encode(eventString));
        };

        // Send initial connection event
        sendEvent(
          { type: "connection", status: "connected", timestamp: Date.now() },
          "connection"
        );

        // Register this client in room subscribers
        if (!roomSubscribers[roomId]) roomSubscribers[roomId] = new Set();
        roomSubscribers[roomId].add(controller);

        console.log(
          `Client connected to room: ${roomId}, total: ${roomSubscribers[roomId].size}`
        );

        // Setup ping to keep connection alive
        const pingInterval = setInterval(() => {
          sendEvent({ type: "ping", timestamp: Date.now() }, "ping");
        }, 15000);

        request.signal.addEventListener("abort", () => {
          console.log("Client disconnected from SSE:", roomId);
          roomSubscribers[roomId].delete(controller);
          clearInterval(pingInterval);
        });
      },
    });

    // Subscribe to Redis channel for this room
    try {
      // For Upstash Redis, the callback is passed to subscribe
      // For our mock implementation, we need to use the method directly
      await redis.subscribe(`${streamKey}:pubsub`, async (message: string) => {
        if (!roomSubscribers[roomId]) return;

        console.log(
          `Received message on channel ${streamKey}:pubsub:`,
          message.substring(0, 100)
        );

        // Get all controllers for this room
        for (const controller of roomSubscribers[roomId]) {
          try {
            // Parse the message to extract the actual message data
            const messageData = JSON.parse(message);

            // We need to send the message part from the Redis entry
            const finalMessage = JSON.stringify(messageData.message);

            // Send the message as a "message" event
            const encoder = new TextEncoder();
            let eventString = `event: message\n`;
            eventString += `data: ${finalMessage}\n\n`;
            controller.enqueue(encoder.encode(eventString));
          } catch (err) {
            console.error("Failed to send message to subscriber", err);
          }
        }
      });
      
      console.log(`Subscribed to Redis channel: ${streamKey}:pubsub`);
    } catch (err) {
      console.error("Failed to subscribe to Redis channel:", err);
      // Continue anyway, client will still receive the initial connection event
    }

    return new Response(stream, { headers });
  } catch (err) {
    console.error("SSE error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
