"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useRouter } from "next/navigation";
import CreateRoomDialog from "./CreateRoomDialog";
import { generateRandomIdentity } from "@/app/lib/utils";
import { useColorMode } from "@/app/contexts/ThemeContext";
import Image from "next/image";

interface Room {
  _id: string;
  name: string;
  lastActive: string;
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const router = useRouter();
  const { mode, toggleColorMode } = useColorMode();
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userId");
      if (stored) return stored;
      const newId = generateRandomIdentity().id;
      localStorage.setItem("userId", newId);
      return newId;
    }
    return "";
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const handleRoomClick = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <Box
      className={`p-6 max-w-6xl mx-auto ${
        mode === "dark" ? "bg-gray-900 text-white" : ""
      }`}
      sx={{ minHeight: "100vh" }}
    >
      <Box className="flex justify-between items-center mb-8">
        <div>
          <Image
            src="/logo.svg"
            alt="BreakRoom Logo"
            width={200}
            height={50}
            className="mb-2"
          />
          <Typography variant="subtitle1" color="textSecondary">
            Take a break and chat anonymously
          </Typography>
        </div>
        <div className="flex items-center gap-4">
          {/* <Tooltip
            title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            <IconButton onClick={toggleColorMode}>
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip> */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            className="px-4 py-2"
          >
            Create Room
          </Button>
        </div>
      </Box>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Paper
            key={room._id}
            className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:translate-y-[-4px] border border-gray-100"
            onClick={() => handleRoomClick(room._id)}
            elevation={2}
          >
            <Typography variant="h6" className="mb-3 font-semibold">
              {room.name}
            </Typography>
            <div className="flex items-center justify-between">
              <Typography
                variant="body2"
                className="py-1 px-2 rounded-full bg-emerald-100 text-emerald-800"
              >
                🌐 Public
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Active {new Date(room.lastActive).toLocaleDateString()}
              </Typography>
            </div>
          </Paper>
        ))}
      </div>

      <CreateRoomDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        userId={userId}
        onRoomCreated={fetchRooms}
      />
    </Box>
  );
}
