"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Skeleton,
  Tabs,
  Tab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import PersonIcon from "@mui/icons-material/Person";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { IconButton, Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import CreateRoomDialog from "./CreateRoomDialog";
import { generateRandomIdentity } from "@/app/lib/utils";
import { useColorMode } from "@/app/contexts/ThemeContext";
import Image from "next/image";
import ConnectionStatus from "./ConnectionStatus";

interface UserInfo {
  id: string;
  name: string;
  emoji: string;
  _id: string;
}

interface Room {
  _id: string;
  name: string;
  isPrivate: boolean;
  isPersonal?: boolean;
  p1: UserInfo;
  p2: UserInfo;
  creatorId: string;
  lastActive: string;
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [shareSnackbar, setShareSnackbar] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const router = useRouter();
  const { mode } = useColorMode();
  const [userInfo] = useState(() => {
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

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      let apiRooms: Room[] = [];
      // let fetchError = false;

      try {
        // Fetch regular rooms
        const roomsResponse = await fetch(
          `/api/rooms?userId=${encodeURIComponent(userInfo.id)}`
        );
        const regularRooms = await roomsResponse.json();

        // Fetch personal rooms
        const personalRoomsResponse = await fetch(
          `/api/rooms/personal?userId=${encodeURIComponent(userInfo.id)}`
        );
        const personalRooms = await personalRoomsResponse.json();

        // Combine both types of rooms
        apiRooms = [...regularRooms, ...(personalRooms.rooms || [])];

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
        // fetchError = true;
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
  }, [userInfo.id]); // Add userInfo.id as dependency for useCallback

  useEffect(() => {
    // Fetch rooms once when component mounts
    fetchRooms();
  }, [fetchRooms]); // Add fetchRooms as dependency

  const handleRoomClick = (roomId: string) => {
    setNavigating(true);
    router.push(`/room/${roomId}`);
  };

  const handleShareRoom = (room: Room, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent room navigation when share is clicked

    const roomLink = `${window.location.origin}/room/${room._id}`;
    const shareText = `${roomLink}`;

    // Copy to clipboard
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        setShareSnackbar(true);
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setShareSnackbar(true);
      });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getFilteredRooms = () => {
    switch (tabValue) {
      case 0: // Public
        return rooms.filter((room) => !room.isPrivate && !room.isPersonal);
      case 1: // Private
        return rooms.filter((room) => room.isPrivate && !room.isPersonal);
      case 2: // Personal
        return rooms.filter(
          (room) =>
            room.isPersonal &&
            (room.p1.id === userInfo.id || room.p2.id === userInfo.id)
        );
      default:
        return rooms;
    }
  };

  return (
    <Box
      className={`p-6 mx-auto w-full ${
        mode === "dark" ? "bg-gray-900 text-white" : ""
      }`}
      sx={{ minHeight: "calc(100vh - 2rem)" }}
    >
      <Box className="flex flex-row justify-between items-start mb-8 gap-4">
        <div className="flex-1">
          <Image
            src="/logo.svg"
            alt="BreakRoom Logo"
            width={200}
            height={50}
            className="mb-2"
          />
          <Typography
            variant="subtitle1"
            color="textSecondary"
            className="hidden sm:block"
          >
            Take a break and chat anonymously
          </Typography>
        </div>
        <div className="flex items-center">
          {/* Theme toggle has been removed */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            className="px-4 py-2 whitespace-nowrap"
          >
            Create Room
          </Button>
        </div>
      </Box>

      {/* Tabs for filtering rooms */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="room types"
        >
          <Tab icon={<PublicIcon />} label="Public" iconPosition="start" />
          <Tab icon={<LockIcon />} label="Private" iconPosition="start" />
          <Tab icon={<PersonIcon />} label="Personal" iconPosition="start" />
        </Tabs>
      </Box>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            {Array.from(new Array(6)).map((_, index) => (
              <Paper
                key={`skeleton-${index}`}
                className="p-6 border border-gray-100 hover:shadow-lg smooth-transition"
                elevation={2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Skeleton
                  variant="text"
                  width="70%"
                  height={32}
                  className="mb-3"
                  animation="wave"
                />
                <Box className="flex items-center justify-between mt-auto">
                  <Skeleton
                    variant="rounded"
                    width={80}
                    height={24}
                    sx={{ borderRadius: "9999px" }}
                    className="py-1 px-2"
                    animation="wave"
                  />
                  <Skeleton
                    variant="text"
                    width={120}
                    height={20}
                    animation="wave"
                  />
                </Box>
              </Paper>
            ))}
          </>
        ) : tabValue === 2 && getFilteredRooms().length === 0 ? (
          // No personal chats message
          <div className="col-span-3 text-center py-20">
            <PersonIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h5" color="textSecondary" className="mb-2">
              No Personal Chats Yet
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Click on someone&apos;s name in a chat room to start a personal
              conversation.
            </Typography>
          </div>
        ) : getFilteredRooms().length > 0 ? (
          getFilteredRooms().map((room) => (
            <Paper
              key={room._id}
              className={`p-6 cursor-pointer hover:shadow-lg smooth-transition hover:translate-y-[-4px] border border-gray-100 relative ${
                navigating ? "opacity-50" : ""
              }`}
              onClick={() => handleRoomClick(room._id)}
              elevation={2}
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              {/* Copy icon in top-right corner */}
              <IconButton
                onClick={(e) => handleShareRoom(room, e)}
                className="absolute top-2 right-2 p-1"
                size="small"
                sx={{
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.08)" },
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>

              <Typography
                variant="h6"
                className="mb-3 font-semibold truncate pr-8"
              >
                {room.isPersonal
                  ? `${
                      userInfo.id === room.p1.id
                        ? `${room.p2.name} ${room.p2.emoji}`
                        : `${room.p1.name} ${room.p1.emoji}`
                    }`
                  : room.name}
              </Typography>
              <div className="flex items-center justify-between mt-auto">
                <Typography
                  variant="body2"
                  className={`py-1 px-2 rounded-full flex items-center gap-1 ${
                    room.isPersonal
                      ? "bg-purple-100 text-purple-800"
                      : room.isPrivate
                      ? "bg-orange-100 text-orange-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {room.isPrivate ? (
                    <>
                      <LockIcon fontSize="small" />
                      Private
                    </>
                  ) : (
                    <>
                      <PublicIcon fontSize="small" />
                      Public
                    </>
                  )}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Active {new Date(room.lastActive).toLocaleDateString("en-GB")}
                </Typography>
              </div>
            </Paper>
          ))
        ) : (
          <div className="col-span-3 text-center py-10">
            <Typography variant="h6" color="textSecondary">
              {tabValue === 0
                ? "No public rooms available. Create a new public room to get started!"
                : "No private rooms available. Create a new private room to get started!"}
            </Typography>
          </div>
        )}
      </div>

      <CreateRoomDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        userId={userInfo.id}
        onRoomCreated={fetchRooms}
      />

      {/* Connection status indicator */}
      <ConnectionStatus />

      {/* Share confirmation snackbar */}
      <Snackbar
        open={shareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShareSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShareSnackbar(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Share link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
}
