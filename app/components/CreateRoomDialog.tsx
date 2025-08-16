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
} from "@mui/material";
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
