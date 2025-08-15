"use client";

import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";
import CreateRoomDialog from "./CreateRoomDialog";
import { generateRandomIdentity } from "@/app/lib/utils";
import { useColorMode } from "@/app/contexts/ThemeContext";
import Image from "next/image";
import ConnectionStatus from "./ConnectionStatus";
import Loader from "./Loader";
import RoomSkeleton from "./RoomSkeleton";

interface Room {
  _id: string;
  name: string;
  lastActive: string;
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();
  const { mode } = useColorMode();
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
    setLoading(true);
    try {
      // Try to fetch from API first
      let apiRooms: Room[] = [];
      let fetchError = false;

      try {
        const response = await fetch("/api/rooms");
        apiRooms = await response.json();

        // If successful, cache rooms for offline use
        if (Array.isArray(apiRooms) && apiRooms.length > 0) {
          const { saveRoomToLocal } = await import("@/app/lib/offlineStorage");
          for (const room of apiRooms) {
            await saveRoomToLocal({ ...room, synced: true });
          }
        }
      } catch (error) {
        console.warn(
          "Failed to fetch rooms from API, using cached data:",
          error
        );
        fetchError = true;
      }

      // If API fetch failed or returned empty, try to get cached rooms
      if (fetchError || apiRooms.length === 0) {
        const { getLocalRooms } = await import("@/app/lib/offlineStorage");
        const localRooms = await getLocalRooms();

        if (localRooms.length > 0) {
          setRooms(localRooms);
          return; // Use local rooms
        }
      }

      // Use API rooms if available
      if (apiRooms.length > 0) {
        setRooms(apiRooms);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (roomId: string) => {
    setNavigating(true);
    router.push(`/room/${roomId}`);
  };

  return (
    <Box
      className={`p-6 mx-auto w-full ${
        mode === "dark" ? "bg-gray-900 text-white" : ""
      }`}
      sx={{ minHeight: "calc(100vh - 2rem)" }}
    >
      <Box className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
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
          {/* Theme toggle has been removed */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger-fade-in">
        {loading ? (
          <RoomSkeleton count={6} />
        ) : rooms.length > 0 ? (
          rooms.map((room) => (
            <Paper
              key={room._id}
              className={`p-6 cursor-pointer hover:shadow-lg smooth-transition hover:translate-y-[-4px] border border-gray-100 ${
                navigating ? "opacity-50" : ""
              }`}
              onClick={() => handleRoomClick(room._id)}
              elevation={2}
            >
              <Typography variant="h6" className="mb-3 font-semibold truncate">
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
          ))
        ) : (
          <div className="col-span-3 text-center py-10">
            <Typography variant="h6" color="textSecondary">
              No rooms available. Create a new room to get started!
            </Typography>
          </div>
        )}
      </div>

      <CreateRoomDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        userId={userId}
        onRoomCreated={fetchRooms}
      />

      {/* Connection status indicator */}
      <ConnectionStatus />
    </Box>
  );
}
