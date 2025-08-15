"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Avatar,
} from "@mui/material";
import { emojis } from "@/app/lib/utils";

interface UserProfileEditorProps {
  open: boolean;
  onClose: () => void;
  currentName: string;
  currentEmoji: string;
  onSave: (name: string, emoji: string) => void;
}

export default function UserProfileEditor({
  open,
  onClose,
  currentName,
  currentEmoji,
  onSave,
}: UserProfileEditorProps) {
  const [name, setName] = useState(currentName);
  const [emoji, setEmoji] = useState(currentEmoji);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setEmoji(currentEmoji);
    }
  }, [open, currentName, currentEmoji]);

  const handleSave = () => {
    onSave(name, emoji);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Your Profile</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          {/* Name Field */}
          <TextField
            autoFocus
            label="Your Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 30 }}
            helperText={`${name.length}/30 characters`}
          />

          {/* Emoji Picker */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Choose your emoji
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 1,
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
              }}
            >
              {emojis.map((e, index) => (
                <IconButton
                  key={index}
                  onClick={() => setEmoji(e)}
                  sx={{
                    border: emoji === e ? "2px solid" : "none",
                    borderColor: "primary.main",
                    borderRadius: 1,
                    p: 1,
                    fontSize: "1.5rem",
                  }}
                >
                  {e}
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Preview */}
          <Box display="flex" alignItems="center" gap={2} mt={2}>
            <Typography variant="subtitle1">Preview:</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ bgcolor: "primary.main" }}>{emoji}</Avatar>
              <Typography>{name}</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
