"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import { useColorMode } from "@/app/contexts/ThemeContext";
import moment from "moment";
import { generateRandomIdentity } from "@/app/lib/utils";
import { useRouter } from "next/navigation";
import ConnectionStatus from "./ConnectionStatus";
import UserProfileEditor from "./UserProfileEditor";
import MessageSkeleton from "./MessageSkeleton";

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
  const { mode } = useColorMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    _id: string;
    lastActive: string;
    activeUsersCount: number;
  } | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
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

  const handleUpdateUserInfo = (name: string, emoji: string) => {
    const updatedUserInfo = {
      ...userInfo,
      name,
      emoji,
    };

    setUserInfo(updatedUserInfo);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
    }

    // Update user info in the room
    if (socket && roomId) {
      socket.emit("user-activity", {
        roomId,
        userId: userInfo.id,
        userName: name,
        userEmoji: emoji,
      });
    }
  };

  // We're using state setter function without the value to avoid unused variable warning
  const [activeUsers, setActiveUsers] = useState<{
    count: number;
  }>({ count: 0 });

  // Effect for user activity polling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const pollUserActivity = async () => {
      if (!isMounted) return;

      try {
        // Update user activity
        await fetch(`/api/rooms/${roomId}/activity`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userInfo.id,
            userName: userInfo.name,
            userEmoji: userInfo.emoji,
          }),
        });
      } catch (error) {
        console.error("Error updating user activity:", error);
      }

      // Schedule next poll only after current one is complete
      if (isMounted) {
        timeoutId = setTimeout(pollUserActivity, 2000);
      }
    };

    // Start polling
    pollUserActivity();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [roomId, userInfo.id, userInfo.name, userInfo.emoji]);

  // Separate effect for active users polling (every minute)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const pollActiveUsers = async () => {
      if (!isMounted) return;

      try {
        const activeResponse = await fetch(`/api/rooms/${roomId}`);
        const roomData = await activeResponse.json();

        setActiveUsers({
          count: roomData.activeUsersCount,
        });
      } catch (error) {
        console.error("Error polling for active users:", error);
      }

      // Schedule next poll only after current one is complete
      if (isMounted) {
        timeoutId = setTimeout(pollActiveUsers, 60000); // 1 minute interval
      }
    };

    // Start polling
    pollActiveUsers();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  // Ref to track initial load
  const initialLoadComplete = useRef(false);

  // Initial load effect - fetch messages and room info once
  useEffect(() => {
    const initializeRoom = async () => {
      if (initialLoadComplete.current) return;
      initialLoadComplete.current = true;

      try {
        // Fetch room information first
        await fetchRoomInfo();
        // Then fetch messages
        await fetchMessages();
      } catch (error) {
        console.error("Error initializing room:", error);
      }
    };

    initializeRoom();
  }, [fetchMessages, fetchRoomInfo]); // Include dependencies to satisfy ESLint

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
      if (navigator.onLine) {
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
      className={`h-screen flex flex-col p-3 md:p-6 ${
        mode === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <Paper
        elevation={2}
        className="h-full flex flex-col p-0 overflow-hidden max-w-[1600px] mx-auto w-full"
      >
        <Box
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b ${
            mode === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
          sx={{
            backgroundColor:
              mode === "dark" ? "background.paper" : "background.paper",
          }}
        >
          <div className="flex items-center mb-2 sm:mb-0">
            <IconButton
              onClick={() => router.push("/")}
              className="mr-3 flex-shrink-0"
              aria-label="Back to rooms"
              title="Back to rooms"
              color="inherit"
            >
              <ArrowBackIcon />
            </IconButton>
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <Typography
                  variant="h6"
                  className={`font-semibold text-ellipsis ${
                    roomError ? "text-error" : "text-primary"
                  }`}
                  title={roomInfo ? roomInfo.name : roomError || ""}
                  sx={{
                    maxWidth: {
                      xs: "100%",
                      sm: "400px",
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
                  <Box
                    className={`inline-flex items-center px-2 py-1 rounded-full mt-1 sm:mt-0 ${
                      mode === "dark"
                        ? "bg-gray-700 text-green-400"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        activeUsers.count > 0
                          ? "bg-green-400 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <Typography
                      variant="caption"
                      className="font-medium whitespace-nowrap"
                    >
                      {activeUsers.count}{" "}
                      {activeUsers.count === 1 ? "person" : "people"} online
                    </Typography>
                  </Box>
                )}
              </div>
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
              <Box sx={{ display: "flex" }}>
                {userInfo.id !== "avmaurya07" && (
                  <>
                    <Tooltip title="Edit profile">
                      <IconButton
                        onClick={() => setProfileEditorOpen(true)}
                        size="small"
                        className="ml-1"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Generate random identity">
                      <IconButton
                        onClick={regenerateIdentity}
                        size="small"
                        className="ml-1"
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          className={`flex-grow overflow-y-auto p-4 ${
            mode === "dark" ? "bg-gray-800" : "bg-gray-50"
          }`}
        >
          {roomLoading || loading ? (
            <MessageSkeleton count={5} />
          ) : messages.length > 0 ? (
            messages.map((message) => (
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
                  <Typography className="text-left">
                    {message.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="block mt-1 opacity-75"
                  >
                    {moment(message.createdAt).fromNow()}
                    {message.pending && " • Sending..."}
                  </Typography>
                </Box>
              </Box>
            ))
          ) : (
            <Box className="text-center py-10">
              <Typography variant="body1" color="textSecondary">
                No messages yet. Be the first to say hello!
              </Typography>
            </Box>
          )}
          <div ref={messagesEndRef}></div>
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

      {/* User Profile Editor Dialog */}
      <UserProfileEditor
        open={profileEditorOpen}
        onClose={() => setProfileEditorOpen(false)}
        currentName={userInfo.name}
        currentEmoji={userInfo.emoji}
        onSave={handleUpdateUserInfo}
      />
    </Box>
  );
}
