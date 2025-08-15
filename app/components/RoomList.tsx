"use client";

import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";
import CreateRoomDialog from "./CreateRoomDialog";
import { generateRandomIdentity } from "@/app/lib/utils";

interface Room {
  _id: string;
  name: string;
  isPrivate: boolean;
  lastActive: string;
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const router = useRouter();
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
    <Box className="p-4 max-w-4xl mx-auto">
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" component="h1">
          Chat Rooms
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Room
        </Button>
      </Box>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <Paper
            key={room._id}
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleRoomClick(room._id)}
          >
            <Typography variant="h6" className="mb-2">
              {room.name}
            </Typography>
            <div className="flex items-center justify-between">
              <Typography variant="body2" color="textSecondary">
                {room.isPrivate ? "🔒 Private" : "🌐 Public"}
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
