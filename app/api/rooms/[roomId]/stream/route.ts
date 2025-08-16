import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> } // ✅ params is a Promise
) {
  try {
    const { roomId } = await context.params; // ✅ await params
    const streamKey = `room:${roomId}:stream`;

    console.log("Initializing SSE stream for room:", roomId);

    // SSE specific headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Prevents Nginx from buffering the response
    };

    // Create a readable stream to send events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Function to send an SSE event
        const sendEvent = (
          data: Record<string, unknown> | string,
          eventType = ""
        ) => {
          const eventData =
            typeof data === "string" ? data : JSON.stringify(data);
          let eventString = "";

          // Add event type if specified
          if (eventType) {
            eventString += `event: ${eventType}\n`;
          }

          // Split data by newlines to ensure proper formatting
          const dataLines = eventData.split("\n");
          for (const line of dataLines) {
            eventString += `data: ${line}\n`;
          }

          // End the event with a blank line
          eventString += "\n";

          console.log(`Sending ${eventType || "message"} event`);
          controller.enqueue(encoder.encode(eventString));
        };

        // Send initial connection event
        sendEvent(
          { type: "connection", status: "connected", timestamp: Date.now() },
          "connection"
        );

        // Track seen message IDs to avoid duplicates
        const processedMessageIds = new Set<string>();

        // Load initial messages
        try {
          const recentMessages = await redis.lrange(
            `${streamKey}:recent`,
            0,
            19
          );
          console.log(
            `Found ${recentMessages.length} recent messages for initial load`
          );

          for (const messageStr of recentMessages) {
            try {
              // Check if messageStr is already an object (which happens sometimes with Redis)
              let messageEntry;
              if (typeof messageStr === "object" && messageStr !== null) {
                messageEntry = messageStr;
              } else {
                try {
                  messageEntry = JSON.parse(messageStr);
                } catch (parseError) {
                  console.error(
                    "Error parsing initial message as JSON:",
                    parseError
                  );
                  continue; // Skip this message and move to the next
                }
              }

              if (
                !messageEntry ||
                !messageEntry.message ||
                !messageEntry.message._id
              ) {
                console.error(
                  "Invalid initial message structure:",
                  messageEntry
                );
                continue;
              }

              const messageId = messageEntry.message._id;

              if (!processedMessageIds.has(messageId)) {
                console.log("Sending existing message:", messageId);
                sendEvent(messageEntry.message);
                processedMessageIds.add(messageId);
              }
            } catch (parseError) {
              console.error("Error parsing message:", parseError, messageStr);
            }
          }
        } catch (err) {
          console.error("Error loading initial messages:", err);
        }

        // Set up polling for new messages
        const pollForMessages = async () => {
          try {
            const recentMessages = await redis.lrange(
              `${streamKey}:recent`,
              0,
              19
            );

            for (const messageStr of recentMessages) {
              try {
                // Check if messageStr is already an object (which happens sometimes with Redis)
                let messageEntry;
                if (typeof messageStr === "object" && messageStr !== null) {
                  messageEntry = messageStr;
                } else {
                  try {
                    messageEntry = JSON.parse(messageStr);
                  } catch (parseError) {
                    console.error("Error parsing message as JSON:", parseError);
                    continue; // Skip this message and move to the next
                  }
                }

                if (
                  !messageEntry ||
                  !messageEntry.message ||
                  !messageEntry.message._id
                ) {
                  console.error("Invalid message structure:", messageEntry);
                  continue;
                }

                const messageId = messageEntry.message._id;

                if (!processedMessageIds.has(messageId)) {
                  console.log("New message from polling:", messageId);
                  sendEvent(messageEntry.message);
                  processedMessageIds.add(messageId);

                  // Prevent the set from growing too large
                  if (processedMessageIds.size > 1000) {
                    const idsArray = Array.from(processedMessageIds);
                    processedMessageIds.clear();
                    for (
                      let i = idsArray.length - 500;
                      i < idsArray.length;
                      i++
                    ) {
                      processedMessageIds.add(idsArray[i]);
                    }
                  }
                }
              } catch (parseError) {
                console.error("Error parsing message:", parseError, messageStr);
              }
            }
          } catch (err) {
            console.error("Error polling for messages:", err);
          }
        };

        // Setup polling interval
        const pollInterval = setInterval(pollForMessages, 500);

        // Setup ping interval to keep connection alive
        const pingInterval = setInterval(() => {
          sendEvent({ type: "ping", timestamp: Date.now() }, "ping");
        }, 15000);

        // Cleanup when the connection is closed
        request.signal.addEventListener("abort", () => {
          console.log("Client disconnected from SSE stream:", roomId);
          clearInterval(pollInterval);
          clearInterval(pingInterval);
        });
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error("SSE stream error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
