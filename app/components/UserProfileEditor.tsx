"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
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

  const handleSave = () => {
    onSave(name, emoji);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Your Profile</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ mt: 2 }}>
            <TextField
              autoFocus
              label="Your Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputProps={{ maxLength: 30 }}
              helperText={`${name.length}/30 characters`}
            />
          </Grid>
          <Grid item xs={12}>
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
          </Grid>
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="subtitle1">Preview:</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ bgcolor: "primary.main" }}>{emoji}</Avatar>
                <Typography>{name}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
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
