"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  FormControlLabel,
  Switch,
  Box,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import Captcha from "./Captcha";

interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onRoomCreated: () => void;
}

export default function CreateRoomDialog({
  open,
  onClose,
  userId,
  onRoomCreated,
}: CreateRoomDialogProps) {
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const maxRoomNameLength = 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim().substring(0, maxRoomNameLength),
          creatorId: userId,
          isPrivate,
          captchaToken,
        }),
      });

      if (response.ok) {
        onRoomCreated();
        handleClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create room");
        alert(data.error || "Failed to create room");
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setIsPrivate(false);
    setCaptchaToken("");
    setError("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 3,
        className: "rounded-xl",
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle className="bg-gray-50 border-b border-gray-100">
          <span className="text-xl font-semibold text-gray-800">
            Create New BreakRoom
          </span>
        </DialogTitle>
        <DialogContent className="pt-6 pb-4">
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            value={name}
            onChange={(e) =>
              setName(e.target.value.substring(0, maxRoomNameLength))
            }
            required
            className="mb-6"
            placeholder="Enter a name for your room"
            helperText={`Choose a descriptive name for your room (${name.length}/${maxRoomNameLength} characters)`}
            inputProps={{ maxLength: maxRoomNameLength }}
          />

          <Box className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <Typography variant="h6" className="mb-3 text-gray-800 font-medium">
              Room Privacy
            </Typography>
            {userId === "avmaurya07" && (
              <FormControlLabel
                control={
                  <Switch
                    checked={isPrivate}
                    disabled={userId !== "avmaurya07"}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box className="flex items-center gap-2">
                    {isPrivate ? (
                      <LockIcon className="text-orange-600" fontSize="small" />
                    ) : (
                      <PublicIcon className="text-green-600" fontSize="small" />
                    )}
                    <span className="font-medium">
                      {isPrivate ? "Private Room" : "Public Room"}
                    </span>
                  </Box>
                }
              />
            )}
            <Typography variant="body2" className="mt-2 text-gray-600">
              {isPrivate
                ? "🔒 Only you can see this room in the room list. Others can join with an invite link."
                : "🌐 Everyone can see and join this room from the room list."}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}
          <Captcha onVerify={setCaptchaToken} />
        </DialogContent>
        <DialogActions className="bg-gray-50 border-t border-gray-100 p-3">
          <Button
            onClick={handleClose}
            className="text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            className={`px-6 ${isLoading ? "animate-pulse" : ""}`}
          >
            {isLoading ? "Creating..." : "Create Room"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
