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

        // Set up Redis Pub/Sub for real-time updates
        let messageSubscription: NodeJS.Timeout | null = null;

        // Since Upstash Redis REST API doesn't support direct pub/sub in client-side,
        // we'll use a more efficient polling approach with message ID tracking
        let lastMessageIds = new Set<string>();

        // Initialize with existing message IDs to avoid duplicates
        if (processedMessageIds.size > 0) {
          lastMessageIds = new Set(processedMessageIds);
        }

        const checkForNewMessages = async () => {
          try {
            // Fetch only messages from the recent list
            const recentMessages = await redis.lrange(
              `${streamKey}:recent`,
              0,
              19
            );

            // Create a temporary set of new message IDs in this batch
            const currentBatchIds = new Set<string>();
            const newMessages: Array<{
              message: { _id: string; [key: string]: unknown };
              [key: string]: unknown;
            }> = [];

            // Filter for genuinely new messages that we haven't seen before
            for (const messageStr of recentMessages) {
              try {
                const messageEntry =
                  typeof messageStr === "string"
                    ? JSON.parse(messageStr)
                    : messageStr;

                if (!messageEntry?.message?._id) continue;

                const messageId = messageEntry.message._id;

                // Add to current batch set
                currentBatchIds.add(messageId);

                // If we haven't processed this message before, it's new
                if (
                  !lastMessageIds.has(messageId) &&
                  !processedMessageIds.has(messageId)
                ) {
                  newMessages.push(messageEntry);
                }
              } catch {
                // Skip parsing error
              }
            }

            // Update our tracking set with current batch
            lastMessageIds = currentBatchIds;

            if (newMessages.length > 0) {
              console.log(`Found ${newMessages.length} new messages`);

              for (const messageEntry of newMessages) {
                try {
                  if (!messageEntry?.message?._id) {
                    console.error("Invalid message structure:", messageEntry);
                    continue;
                  }

                  const messageId = messageEntry.message._id;

                  if (!processedMessageIds.has(messageId)) {
                    console.log("New message from subscription:", messageId);
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
                  console.error("Error processing message:", parseError);
                }
              }
            }
          } catch (error) {
            console.error("Error checking for new messages:", error);
          }
        };

        // Use a more efficient interval for updates - balance between real-time and performance
        messageSubscription = setInterval(checkForNewMessages, 500);
        console.log(`Subscribed to message updates for room: ${roomId}`);

        // Setup ping interval to keep connection alive
        const pingInterval = setInterval(() => {
          sendEvent({ type: "ping", timestamp: Date.now() }, "ping");
        }, 15000);

        // Cleanup when the connection is closed
        request.signal.addEventListener("abort", () => {
          console.log("Client disconnected from SSE stream:", roomId);
          if (messageSubscription) {
            clearInterval(messageSubscription);
          }
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
