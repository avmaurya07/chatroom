"use client";

import React from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useColorMode } from "@/app/contexts/ThemeContext";
import { saveThemeMode } from "@/app/lib/themeUtils";

/**
 * This component provides debug tools for fixing theme issues
 * It can be temporarily added to any page
 */
export default function ThemeDebugger() {
  const { mode, toggleColorMode } = useColorMode();

  const forceTheme = (newMode: "light" | "dark") => {
    saveThemeMode(newMode);
    window.location.reload();
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Paper className="p-4 m-4" elevation={3}>
      <Typography variant="h6" gutterBottom>
        Theme Debugger
      </Typography>
      <Box className="mb-2">
        <Typography>Current theme mode: {mode}</Typography>
      </Box>
      <Box className="flex gap-2 mb-4">
        <Button variant="contained" color="primary" onClick={toggleColorMode}>
          Toggle Theme
        </Button>
        <Button variant="outlined" onClick={() => forceTheme("light")}>
          Force Light
        </Button>
        <Button variant="outlined" onClick={() => forceTheme("dark")}>
          Force Dark
        </Button>
      </Box>
      <Button variant="outlined" color="error" onClick={clearLocalStorage}>
        Reset All Storage
      </Button>
    </Paper>
  );
}
