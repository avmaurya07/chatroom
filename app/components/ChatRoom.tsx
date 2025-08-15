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
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useSocket } from "@/app/contexts/SocketContext";
import { useColorMode } from "@/app/contexts/ThemeContext";
import moment from "moment";
import { generateRandomIdentity } from "@/app/lib/utils";
import { useRouter } from "next/navigation";

interface Message {
  _id: string;
  userId: string;
  userName: string;
  userEmoji: string;
  content: string;
  createdAt: string;
}

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { mode, toggleColorMode } = useColorMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
  } | null>(null);
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

  const [activeUsers, setActiveUsers] = useState<{
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
      const response = await fetch(`/api/rooms/${roomId}/messages`);
      const data = await response.json();
      setMessages(data);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [roomId]);

  useEffect(() => {
    // Fetch existing messages
    fetchMessages();

    // Fetch room information
    const fetchRoomInfo = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoomInfo(data);
        }
      } catch (error) {
        console.error("Failed to fetch room info:", error);
      }
    };

    fetchRoomInfo();
  }, [fetchMessages, roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const message = {
      roomId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmoji: userInfo.emoji,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      // Clear input immediately for better UX
      setNewMessage("");

      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      socket.emit("send-message", message);
    } catch (error) {
      console.error("Failed to send message:", error);
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
          className={`flex items-center justify-between p-4 border-b ${
            mode === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center">
            <IconButton
              onClick={() => router.push("/")}
              className="mr-3"
              aria-label="Back to rooms"
              title="Back to rooms"
              color="inherit"
            >
              <ArrowBackIcon />
            </IconButton>
            <div>
              <Typography variant="h5" className="font-semibold text-primary">
                {roomInfo ? roomInfo.name : "BreakRoom Chat"}
              </Typography>
              {roomInfo && (
                <Typography
                  variant="caption"
                  color={mode === "dark" ? "text.primary" : "text.secondary"}
                  className="flex items-center"
                >
                  <span className="flex items-center">
                    🌐 Public Room • {activeUsers.count} active{" "}
                    {activeUsers.count === 1 ? "user" : "users"}
                  </span>
                </Typography>
              )}
            </div>
          </div>
          <Box className="flex items-center gap-3">
            <Tooltip
              title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
            >
              <IconButton onClick={toggleColorMode} className="mr-2">
                {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            <Box
              className={`flex items-center ${
                mode === "dark" ? "bg-gray-800" : "bg-gray-100"
              } p-2 rounded-full`}
            >
              <Avatar className="bg-primary-light">{userInfo.emoji}</Avatar>
              <Typography className="ml-2 font-medium">
                {userInfo.name}
              </Typography>
              <IconButton
                onClick={regenerateIdentity}
                size="small"
                className="ml-1"
                title="Change identity"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
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
              }`}
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
                <Typography className="whitespace-pre-wrap break-words">
                  {message.content}
                </Typography>
                <Typography variant="caption" className="block mt-1 opacity-75">
                  {moment(message.createdAt).fromNow()}
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
              disabled={!isConnected}
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
              color="primary"
              disabled={!isConnected || !newMessage.trim()}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              <SendIcon />
            </IconButton>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
