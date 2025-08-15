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
import { useSocket } from "@/app/contexts/SocketContext";
import moment from "moment";
import { generateRandomIdentity } from "@/app/lib/utils";

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
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
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

  useEffect(() => {
    if (socket && roomId) {
      socket.emit("join-room", roomId);

      socket.on("new-message", (message: Message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      return () => {
        socket.emit("leave-room", roomId);
        socket.off("new-message");
      };
    }
  }, [socket, roomId]);

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
  }, [fetchMessages]);

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
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      socket.emit("send-message", message);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const regenerateIdentity = () => {
    const newInfo = generateRandomIdentity();
    setUserInfo(newInfo);
    localStorage.setItem("userInfo", JSON.stringify(newInfo));
  };

  return (
    <Box className="h-screen flex flex-col p-4">
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h5">Chat Room</Typography>
        <Box className="flex items-center gap-2">
          <Avatar className="bg-blue-500">{userInfo.emoji}</Avatar>
          <Typography>{userInfo.name}</Typography>
          <IconButton onClick={regenerateIdentity} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper className="flex-grow overflow-y-auto mb-4 p-4">
        {messages.map((message) => (
          <Box
            key={message._id}
            className={`mb-4 ${
              message.userId === userInfo.id ? "text-right" : "text-left"
            }`}
          >
            <Box
              className={`inline-block max-w-[70%] ${
                message.userId === userInfo.id ? "bg-blue-100" : "bg-gray-100"
              } rounded-lg p-3`}
            >
              <Box className="flex items-center gap-2 mb-1">
                <span>{message.userEmoji}</span>
                <Typography variant="subtitle2">{message.userName}</Typography>
              </Box>
              <Typography>{message.content}</Typography>
              <Typography variant="caption" color="textSecondary">
                {moment(message.createdAt).fromNow()}
              </Typography>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Paper>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!isConnected}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!isConnected || !newMessage.trim()}
        >
          <SendIcon />
        </IconButton>
      </form>
    </Box>
  );
}
