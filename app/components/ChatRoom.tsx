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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  const isAuthorizedRef = useRef(true);
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
    isPersonal?: boolean;
    p1?: {
      id: string;
      name: string;
      emoji: string;
    };
    p2?: {
      id: string;
      name: string;
      emoji: string;
    };
  } | null>(null); // Default to true, will be set based on room info
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [personalChatDialog, setPersonalChatDialog] = useState<{
    open: boolean;
    userName: string;
    userEmoji: string;
    userId: string;
  }>({
    open: false,
    userName: "",
    userEmoji: "",
    userId: "",
  });
  const [unauthorizedDialog, setUnauthorizedDialog] = useState<{
    open: boolean;
    p1?: { name: string; id: string; emoji?: string };
    p2?: { name: string; id: string; emoji?: string };
  }>({
    open: false,
  });
  const [userInfo, setUserInfo] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userInfo");
      if (stored) {
        const parsedInfo = JSON.parse(stored);
        return parsedInfo;
      }
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

  useEffect(() => {
    const validateUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/validate", {
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

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 403) {
            // Username is reserved, generate a new random identity
            const newInfo = generateRandomIdentity();
            setUserInfo(newInfo);
            return;
          }
          throw new Error(data.error || "Failed to validate user info");
        }
      } catch (error) {
        console.error("Error validating user info:", error);
      }
    };

    validateUserInfo();
  }, [userInfo.id, userInfo.name, userInfo.emoji]);

  const handleUpdateUserInfo = async (name: string, emoji: string) => {
    try {
      const response = await fetch("/api/auth/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userInfo.id,
          userName: name,
          userEmoji: emoji,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          alert("This username is reserved. Please choose a different name.");
          return;
        }
        throw new Error(data.error || "Failed to validate user info");
      }

      const updatedUserInfo = {
        ...userInfo,
        name,
        emoji,
      };

      setUserInfo(updatedUserInfo);
      localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
    } catch (error) {
      console.error("Error updating user info:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  // We're using state setter function without the value to avoid unused variable warning
  const [activeUsers, setActiveUsers] = useState<{
    count: number;
  }>({ count: 1 });

  // Effect for user activity polling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    // Skip activity polling for personal rooms
    if (roomInfo?.isPersonal) {
      // Set active users to 2 and don't start polling
      setActiveUsers({ count: 2 }); // Personal rooms always have 2 participants
      return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const pollUserActivity = async () => {
      if (!isMounted) return;

      try {
        // Update user activity
        const res = await fetch(`/api/rooms/${roomId}/activity`, {
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
        const roomData = await res.json();
        if (roomData.success) {
          setActiveUsers({
            count: roomData.activeUsers.length,
          });
        }
      } catch (error) {
        console.error("Error updating user activity:", error);
      }

      // Schedule next poll only after current one is complete
      if (isMounted) {
        timeoutId = setTimeout(pollUserActivity, 60000); // Update activity every minute
      }
    };

    // Start polling
    pollUserActivity();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [
    roomId,
    userInfo.id,
    userInfo.name,
    userInfo.emoji,
    roomInfo?.isPersonal,
  ]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      // Only fetch messages if we have room info and no errors
      // if (!roomInfo || roomError) {
      //   setLoading(false);
      //   return;
      // }

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
      setMessages([]); // Clear messages when loading new room

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
            activeUsersCount: localRoom.activeUsersCount || 1,
          });
        } else {
          setRoomError("Room not found in cache. Check your connection.");
        }
      } else {
        // Check authorization for personal chats before setting room info
        if (apiRoom?.isPersonal) {
          const authorized =
            apiRoom.p1?.id === userInfo.id || apiRoom.p2?.id === userInfo.id;
          isAuthorizedRef.current = authorized;
          if (!authorized) {
            setUnauthorizedDialog({
              open: true,
              p1: apiRoom.p1 || undefined,
              p2: apiRoom.p2 || undefined,
            });
            setRoomError("Unauthorized: This is a private conversation");
            setRoomLoading(false);
            return;
          }
        }

        // Use API room if available and authorized
        setRoomInfo(apiRoom);
      }
    } catch (error) {
      setRoomError("An error occurred while fetching room data");
      console.error("Failed to fetch room info:", error);
    } finally {
      setRoomLoading(false);
    }
  }, [roomId, userInfo.id]); // Ref to track initial load
  const initialLoadComplete = useRef(false);

  // Effect for SSE connection and initial room setup
  useEffect(() => {
    const initializeRoom = async () => {
      if (initialLoadComplete.current) return;
      initialLoadComplete.current = true;

      try {
        // Fetch room information first
        await fetchRoomInfo();
        // Then fetch initial messages
        await fetchMessages();

        // Skip SSE connection for personal chats
        if (roomInfo?.isPersonal) {
          console.log("Skipping SSE connection for personal chat");
          return;
        }

        // Setup SSE connection

        const eventSource = new EventSource(`/api/rooms/${roomId}/stream`);

        // Track messages we've already seen
        const seenMessageIds = new Set();

        // Add all current messages to seen set
        setMessages((currentMessages) => {
          currentMessages.forEach((msg) => seenMessageIds.add(msg._id));
          return currentMessages;
        });

        // Handle connection events
        eventSource.addEventListener("connection", (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("SSE connection established:", data);
          } catch (error) {
            console.error("Error parsing connection event:", error);
          }
        });

        // Handle ping events to keep connection alive
        eventSource.addEventListener("ping", (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("SSE ping received:", data.timestamp);
          } catch (error) {
            console.error("Error parsing ping event:", error);
          }
        });

        // Handle regular message events
        eventSource.onmessage = (event) => {
          try {
            console.log("SSE message received:", event.data.substring(0, 100));
            const data = JSON.parse(event.data);

            // Handle connection status messages
            if (data.type === "connection" || data.type === "ping") {
              return;
            }

            // Handle actual messages
            // Avoid adding duplicate messages
            if (data._id && !seenMessageIds.has(data._id)) {
              seenMessageIds.add(data._id);

              setMessages((prevMessages) => {
                // Check if this is a real message replacing a temporary one
                const tempMessageIndex = prevMessages.findIndex(
                  (msg) =>
                    msg._id.startsWith("temp_") &&
                    msg.userId === data.userId &&
                    msg.content === data.content &&
                    Math.abs(
                      new Date(msg.createdAt).getTime() -
                        new Date(data.createdAt).getTime()
                    ) < 30000 // Within 30 seconds
                );

                if (tempMessageIndex !== -1) {
                  // Replace temporary message with real one
                  const newMessages = [...prevMessages];
                  newMessages[tempMessageIndex] = data;
                  console.log(
                    "Replaced temporary message with real message:",
                    data
                  );
                  return newMessages;
                }

                // Also check if we already have this exact message ID
                if (prevMessages.some((msg) => msg._id === data._id)) {
                  return prevMessages;
                }

                // Additional check: if this is from current user and very recent, it might be a duplicate
                // Check if we have a message with same content from same user within last 5 seconds
                const now = new Date().getTime();
                const isDuplicateRecent = prevMessages.some(
                  (msg) =>
                    msg.userId === data.userId &&
                    msg.content === data.content &&
                    msg.userId === userInfo.id && // Only check for current user's messages
                    Math.abs(now - new Date(data.createdAt).getTime()) < 5000 // Within 5 seconds
                );

                if (isDuplicateRecent) {
                  console.log(
                    "Skipping duplicate recent message from current user:",
                    data
                  );
                  return prevMessages;
                }

                // Add new message
                console.log("New message from SSE:", data);
                const newMessages = [...prevMessages, data];
                return newMessages;
              });

              // Scroll to the bottom for new messages
              setTimeout(scrollToBottom, 100);
            }
          } catch (error) {
            console.error("Error processing SSE message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE Error:", error);
          // Try to reconnect after a delay instead of just closing
          setTimeout(() => {
            eventSource.close();
            initializeRoom();
          }, 5000);
        };

        // Cleanup SSE connection when component unmounts
        return () => {
          console.log("Closing SSE connection");
          eventSource.close();
        };
      } catch (error) {
        console.error("Error initializing room:", error);
      }
    };

    initializeRoom();
  }, [fetchMessages, fetchRoomInfo, roomId, userInfo.id, roomInfo?.isPersonal]); // Include roomId, userInfo.id and isPersonal

  const handleStartPersonalChat = (
    otherUserId: string,
    otherUserName: string,
    otherUserEmoji: string
  ) => {
    setPersonalChatDialog({
      open: true,
      userId: otherUserId,
      userName: otherUserName,
      userEmoji: otherUserEmoji,
    });
  };

  const createPersonalChat = async () => {
    try {
      const response = await fetch("/api/rooms/personal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId1: userInfo.id,
          userId2: personalChatDialog.userId,
          userName1: userInfo.name,
          userName2: personalChatDialog.userName,
          userEmoji1: userInfo.emoji,
          userEmoji2: personalChatDialog.userEmoji,
        }),
      });

      const data = await response.json();
      if (data.roomId) {
        router.push(`/room/${data.roomId}`);
      }
      setPersonalChatDialog((prev) => ({ ...prev, open: false }));
    } catch (error) {
      console.error("Error creating personal chat:", error);
      setPersonalChatDialog((prev) => ({ ...prev, open: false }));
    }
  };

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

          // Don't add this message again when it comes through SSE
          // We'll let the SSE handler replace it if needed
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
          <div className="flex flex-row items-center justify-between w-full gap-2">
            <div className="flex items-center min-w-0 flex-1">
              <IconButton
                onClick={() => router.push("/")}
                className="mr-3 flex-shrink-0"
                aria-label="Back to rooms"
                title="Back to rooms"
                color="inherit"
              >
                <ArrowBackIcon />
              </IconButton>
              <div>
                <div className="flex flex-row items-center gap-2 min-w-0 overflow-hidden">
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
                        {roomInfo.isPersonal
                          ? (() => {
                              // Find the other participant
                              const otherPerson =
                                roomInfo.p1?.id === userInfo.id
                                  ? roomInfo.p2
                                  : roomInfo.p1;
                              return otherPerson
                                ? `${otherPerson.emoji} ${otherPerson.name}`
                                : roomInfo.name;
                            })()
                          : roomInfo.name}
                      </span>
                    ) : (
                      "Unknown Room"
                    )}
                  </Typography>
                  {roomInfo &&
                    !roomLoading &&
                    !roomError &&
                    !roomInfo.isPersonal && (
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
          </div>
          <Box className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Only show profile in non-personal rooms */}
            {!roomInfo?.isPersonal && (
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
            )}
          </Box>
        </Box>

        <Box
          className={`flex-grow overflow-y-auto p-4 ${
            mode === "dark" ? "bg-gray-800" : "bg-gray-50"
          }`}
        >
          {roomLoading || loading ? (
            <MessageSkeleton count={5} />
          ) : !isAuthorizedRef.current ? (
            <Box className="text-center py-10">
              <Typography variant="body1" color="textSecondary">
                You are not authorized to view this conversation.
              </Typography>
            </Box>
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
                  {!roomInfo?.isPersonal && (
                    <Box className="flex items-center gap-2 mb-1">
                      <span>{message.userEmoji}</span>
                      <Typography
                        variant="subtitle2"
                        className={`font-medium ${
                          message.userId !== userInfo.id
                            ? "hover:underline cursor-pointer"
                            : ""
                        }`}
                        onClick={() => {
                          if (message.userId !== userInfo.id) {
                            handleStartPersonalChat(
                              message.userId,
                              message.userName,
                              message.userEmoji
                            );
                          }
                        }}
                      >
                        {message.userName}
                      </Typography>
                    </Box>
                  )}
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

      {/* Personal Chat Dialog */}
      <Dialog
        open={personalChatDialog.open}
        onClose={() =>
          setPersonalChatDialog((prev) => ({ ...prev, open: false }))
        }
        PaperProps={{
          elevation: 8,
          className: mode === "dark" ? "bg-gray-800" : "bg-white",
        }}
      >
        <DialogTitle className={mode === "dark" ? "text-white" : ""}>
          Start Personal Chat
        </DialogTitle>
        <DialogContent className={mode === "dark" ? "text-white" : ""}>
          <Box className="flex items-center gap-2 mt-2">
            <Avatar className="bg-primary-light">
              {personalChatDialog.userEmoji}
            </Avatar>
            <Typography variant="body1">
              Would you like to start a personal chat with{" "}
              <span className="font-semibold">
                {personalChatDialog.userName}
              </span>
              ?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button
            onClick={() =>
              setPersonalChatDialog((prev) => ({ ...prev, open: false }))
            }
            className={mode === "dark" ? "text-gray-300" : ""}
          >
            Cancel
          </Button>
          <Button
            onClick={createPersonalChat}
            variant="contained"
            color="primary"
          >
            Start Chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unauthorized Access Dialog */}
      <Dialog
        open={unauthorizedDialog.open}
        onClose={() =>
          setUnauthorizedDialog((prev) => ({ ...prev, open: false }))
        }
        PaperProps={{
          elevation: 8,
          className: mode === "dark" ? "bg-gray-800" : "bg-white",
        }}
      >
        <DialogTitle className={mode === "dark" ? "text-white" : ""}>
          Private Conversation
        </DialogTitle>
        <DialogContent
          className={`${
            mode === "dark" ? "text-white" : ""
          } text-center font-bold`}
        >
          Chat with
          <Typography variant="body1" className="mb-4"></Typography>
          <Box className="flex flex-col gap-3">
            {unauthorizedDialog.p1 && (
              <Button
                variant="outlined"
                onClick={() => {
                  setUnauthorizedDialog((prev) => ({ ...prev, open: false }));
                  handleStartPersonalChat(
                    unauthorizedDialog.p1!.id,
                    unauthorizedDialog.p1!.name,
                    "🤔" // Default emoji since we don't have it
                  );
                }}
                className={mode === "dark" ? "border-gray-600" : ""}
              >
                {unauthorizedDialog.p1.emoji} {unauthorizedDialog.p1.name}
              </Button>
            )}
            {unauthorizedDialog.p2 && (
              <Button
                variant="outlined"
                onClick={() => {
                  setUnauthorizedDialog((prev) => ({ ...prev, open: false }));
                  handleStartPersonalChat(
                    unauthorizedDialog.p2!.id,
                    unauthorizedDialog.p2!.name,
                    "🤔" // Default emoji since we don't have it
                  );
                }}
                className={mode === "dark" ? "border-gray-600" : ""}
              >
                {unauthorizedDialog.p2.emoji} {unauthorizedDialog.p2.name}
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button
            onClick={() => {
              setUnauthorizedDialog((prev) => ({ ...prev, open: false }));
              router.push("/");
            }}
            variant="contained"
            color="primary"
          >
            Back to Rooms
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
