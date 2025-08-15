"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSocket } from "@/app/contexts/SocketContext";
// We only need mode from useColorMode since toggleColorMode is commented out
import { useColorMode } from "@/app/contexts/ThemeContext";
import moment from "moment";
import { generateRandomIdentity } from "@/app/lib/utils";
import { useRouter } from "next/navigation";
import ConnectionStatus from "./ConnectionStatus";

interface Message {
  _id: string;
  userId: string;
  userName: string;
  userEmoji: string;
  content: string;
  createdAt: string;
  pending?: boolean;
  synced?: boolean;
}

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { mode } = useColorMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    _id: string;
    lastActive: string;
    activeUsersCount: number;
  } | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userInfo");
      if (stored) return JSON.parse(stored);
      const newInfo = generateRandomIdentity();
      localStorage.setItem("userInfo", JSON.stringify(newInfo));
      return newInfo;
    }
    return generateRandomIdentity();
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // We're using state setter function without the value to avoid unused variable warning
  const [, setActiveUsers] = useState<{
    count: number;
    users: Array<{
      userId: string;
      userName: string;
      userEmoji: string;
      lastActive: string;
    }>;
  }>({ count: 0, users: [] });

  useEffect(() => {
    if (socket && roomId) {
      // Join room with user information
      socket.emit("join-room", roomId, {
        userId: userInfo.id,
        userName: userInfo.name,
        userEmoji: userInfo.emoji,
      });

      socket.on("new-message", (message: Message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      socket.on(
        "active-users-update",
        (data: {
          count: number;
          users: Array<{
            userId: string;
            userName: string;
            userEmoji: string;
            lastActive: string;
          }>;
        }) => {
          setActiveUsers(data);
        }
      );

      // Emit user activity every minute to keep active status
      const activityInterval = setInterval(() => {
        socket.emit("user-activity", {
          roomId,
          userId: userInfo.id,
          userName: userInfo.name,
          userEmoji: userInfo.emoji,
        });
      }, 60000);

      return () => {
        socket.emit("leave-room", roomId);
        socket.off("new-message");
        socket.off("active-users-update");
        clearInterval(activityInterval);
      };
    }
  }, [socket, roomId, userInfo.id, userInfo.name, userInfo.emoji]);

  const fetchMessages = useCallback(async () => {
    try {
      // Try to fetch from API first
      let apiMessages: Message[] = [];
      let fetchError = false;

      try {
        const response = await fetch(`/api/rooms/${roomId}/messages`);
        apiMessages = await response.json();

        // If successful, cache messages for offline use
        if (Array.isArray(apiMessages) && apiMessages.length > 0) {
          const { saveMessageToLocal } = await import(
            "@/app/lib/offlineStorage"
          );
          for (const msg of apiMessages) {
            await saveMessageToLocal({ ...msg, roomId, synced: true });
          }
        }
      } catch (error) {
        console.warn(
          "Failed to fetch messages from API, using cached data:",
          error
        );
        fetchError = true;
      }

      // If API fetch failed or returned empty, try to get cached messages
      if (fetchError || apiMessages.length === 0) {
        const { getLocalMessages } = await import("@/app/lib/offlineStorage");
        const localMessages = await getLocalMessages(roomId);

        if (localMessages.length > 0) {
          setMessages(localMessages);
          scrollToBottom();
          return; // Use local messages
        }
      }

      // Use API messages if available
      if (apiMessages.length > 0) {
        setMessages(apiMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [roomId]);

  const fetchRoomInfo = useCallback(async () => {
    try {
      setRoomLoading(true);
      setRoomError(null);

      // Try to fetch from API
      let apiRoom = null;
      let fetchError = false;

      try {
        const response = await fetch(`/api/rooms/${roomId}`);

        if (response.ok) {
          apiRoom = await response.json();

          // Cache room info for offline use
          const { saveRoomToLocal } = await import("@/app/lib/offlineStorage");
          await saveRoomToLocal({ ...apiRoom, synced: true });
        } else {
          const errorData = await response.json();
          fetchError = true;
          console.error("Failed to fetch room info:", errorData);
        }
      } catch (error) {
        fetchError = true;
        console.warn(
          "Failed to fetch room from API, using cached data:",
          error
        );
      }

      // If API fetch failed, try to get cached room info
      if (fetchError || !apiRoom) {
        const { getLocalRoom } = await import("@/app/lib/offlineStorage");
        const localRoom = await getLocalRoom(roomId);

        if (localRoom) {
          // Add default activeUsersCount if missing
          setRoomInfo({
            ...localRoom,
            activeUsersCount: localRoom.activeUsersCount || 0,
          });
        } else {
          setRoomError("Room not found in cache. Check your connection.");
        }
      } else {
        // Use API room if available
        setRoomInfo(apiRoom);
      }
    } catch (error) {
      setRoomError("An error occurred while fetching room data");
      console.error("Failed to fetch room info:", error);
    } finally {
      setRoomLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    // Fetch existing messages
    fetchMessages();

    // Fetch room information
    fetchRoomInfo();
  }, [fetchMessages, fetchRoomInfo]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      roomId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmoji: userInfo.emoji,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    // Clear input immediately for better UX
    setNewMessage("");

    // Create a temporary message ID for local display
    const tempMessage: Message = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmoji: userInfo.emoji,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add message to UI immediately
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      // Check if we're online
      if (navigator.onLine && socket) {
        // We're online, send to API
        const response = await fetch(`/api/rooms/${roomId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          // Message sent successfully
          const { saveMessageToLocal } = await import(
            "@/app/lib/offlineStorage"
          );
          const sentMessage = await response.json();

          // Replace temp message with the real one from server
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempMessage._id ? sentMessage : msg))
          );

          // Cache the message
          await saveMessageToLocal({ ...sentMessage, roomId, synced: true });

          // Emit to socket for real-time updates
          socket.emit("send-message", sentMessage);
        }
      } else {
        // We're offline, queue the message for later
        const { queueMessageForSync } = await import(
          "@/app/lib/offlineStorage"
        );
        const { saveMessageToLocal } = await import("@/app/lib/offlineStorage");

        // Queue message for sync
        await queueMessageForSync(roomId, message);

        // Save message locally with pending state
        await saveMessageToLocal({
          ...tempMessage,
          roomId,
          pending: true,
          synced: false,
        });

        // Update UI to show pending state
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessage._id ? { ...msg, pending: true } : msg
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Queue the message for later delivery
      const { queueMessageForSync } = await import("@/app/lib/offlineStorage");
      await queueMessageForSync(roomId, message);
    }
  };

  const regenerateIdentity = () => {
    // Generate new name and emoji but keep the same ID
    const randomIdentity = generateRandomIdentity();
    const newInfo = {
      ...randomIdentity,
      id: userInfo.id, // Preserve the existing ID
    };
    setUserInfo(newInfo);
    localStorage.setItem("userInfo", JSON.stringify(newInfo));
  };

  return (
    <Box
      className={`h-screen flex flex-col p-6 ${
        mode === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <Paper elevation={2} className="h-full flex flex-col p-0 overflow-hidden">
        <Box
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b ${
            mode === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
          sx={{
            backgroundColor:
              mode === "dark" ? "background.paper" : "background.paper",
          }}
        >
          <div className="flex items-center flex-1 min-w-0 overflow-hidden mb-2 sm:mb-0">
            <IconButton
              onClick={() => router.push("/")}
              className="mr-3 flex-shrink-0"
              aria-label="Back to rooms"
              title="Back to rooms"
              color="inherit"
            >
              <ArrowBackIcon />
            </IconButton>
            <div className="flex-1 min-w-0">
              <Typography
                variant="h6"
                className={`font-semibold text-ellipsis truncate-fade ${
                  roomError ? "text-error" : "text-primary"
                }`}
                title={roomInfo ? roomInfo.name : roomError || ""}
                sx={{
                  maxWidth: {
                    xs: "unset", // Mobile screens
                    sm: "unset", // Tablet screens
                    md: "unset", // Desktop screens
                    lg: "unset", // Large screens
                  },
                  "&:hover": {
                    opacity: 0.9,
                  },
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {roomLoading ? (
                  <span className="inline-flex items-center">
                    <span className="animate-pulse">Loading room...</span>
                  </span>
                ) : roomError ? (
                  <span className="inline-flex items-center">
                    <span>Error</span>
                    <IconButton
                      size="small"
                      onClick={() => fetchRoomInfo()}
                      title="Retry loading room"
                      className="ml-2"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </span>
                ) : roomInfo ? (
                  <span
                    className="room-name"
                    style={{ maxWidth: "100%", display: "inline-block" }}
                  >
                    {roomInfo.name}
                  </span>
                ) : (
                  "Unknown Room"
                )}
              </Typography>
              {roomInfo && !roomLoading && !roomError && (
                <Typography
                  variant="caption"
                  color={mode === "dark" ? "text.primary" : "text.secondary"}
                  className="flex items-center"
                >
                  {/* Active users display has been removed */}
                </Typography>
              )}
            </div>
          </div>
          <Box className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Theme toggling functionality has been removed */}
            <Box
              className={`flex items-center ${
                mode === "dark" ? "bg-gray-800" : "bg-gray-100"
              } p-2 rounded-full`}
              sx={{
                maxWidth: {
                  xs: "unset",
                  sm: "unset",
                },
              }}
            >
              <Avatar className="bg-primary-light flex-shrink-0">
                {userInfo.emoji}
              </Avatar>
              <Typography className="ml-2 font-medium truncate">
                {userInfo.name}
              </Typography>
              {userInfo.id !== "avmaurya07" && (
                <IconButton
                  onClick={regenerateIdentity}
                  size="small"
                  className="ml-1"
                  title="Change identity"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </Box>

        <Box
          className={`flex-grow overflow-y-auto p-4 ${
            mode === "dark" ? "bg-gray-800" : "bg-gray-50"
          }`}
        >
          {messages.map((message) => (
            <Box
              key={message._id}
              className={`mb-4 ${
                message.userId === userInfo.id ? "text-right" : "text-left"
              } ${message.pending ? "opacity-70" : ""}`}
            >
              <Box
                className={`inline-block max-w-[70%] ${
                  message.userId === userInfo.id
                    ? mode === "dark"
                      ? "bg-primary text-white message-right"
                      : "bg-primary-light text-white message-right"
                    : mode === "dark"
                    ? "bg-gray-700 text-white border border-gray-600 message-left"
                    : "bg-white border border-gray-200 message-left"
                } rounded-lg p-3 shadow-sm transition-colors`}
                sx={{
                  boxShadow:
                    message.userId === userInfo.id
                      ? mode === "dark"
                        ? "0 2px 5px rgba(0,0,0,0.3)"
                        : "0 2px 5px rgba(0,0,0,0.1)"
                      : mode === "dark"
                      ? "0 1px 3px rgba(0,0,0,0.2)"
                      : "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <Box className="flex items-center gap-2 mb-1">
                  <span>{message.userEmoji}</span>
                  <Typography variant="subtitle2" className="font-medium">
                    {message.userName}
                  </Typography>
                </Box>
                <Typography className="text-left">{message.content}</Typography>
                <Typography variant="caption" className="block mt-1 opacity-75">
                  {moment(message.createdAt).fromNow()}
                  {message.pending && (
                    <span className="ml-2" title="Waiting to be sent">
                      ⏳
                    </span>
                  )}
                </Typography>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Box
          className={`p-3 border-t ${
            mode === "dark"
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              size="small"
              className={`rounded-full ${mode === "dark" ? "bg-gray-700" : ""}`}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "9999px",
                  ...(mode === "dark" && {
                    backgroundColor: "rgba(55, 65, 81, 0.8)",
                  }),
                },
                "& .MuiOutlinedInput-input": {
                  ...(mode === "dark" && {
                    color: "#fff",
                  }),
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  ...(mode === "dark" && {
                    borderColor: "rgba(75, 85, 99, 0.5)",
                  }),
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  ...(mode === "dark" && {
                    borderColor: "rgba(156, 163, 175, 0.5)",
                  }),
                },
              }}
            />
            <IconButton
              type="submit"
              disabled={!newMessage.trim()}
              className="text-blue-500"
            >
              <SendIcon className="text-blue-500" />
            </IconButton>
          </form>
        </Box>
      </Paper>

      {/* Connection status indicator */}
      <ConnectionStatus />
    </Box>
  );
}
