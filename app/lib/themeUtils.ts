"use client";

/**
 * This file contains utility functions for theme handling in the app
 */

import { PaletteMode } from "@mui/material";

// Constants
const THEME_MODE_KEY = "chatRoomThemeMode";

/**
 * Get the stored theme mode from localStorage or return the default
 */
export function getSavedThemeMode(): PaletteMode {
  if (typeof window === "undefined") {
    return "light"; // Default for SSR
  }

  try {
    const savedMode = localStorage.getItem(
      THEME_MODE_KEY
    ) as PaletteMode | null;

    // Always default to "light" if no valid value is found
    if (savedMode !== "dark" && savedMode !== "light") {
      // If no valid theme is stored, save the default "light" theme
      saveThemeMode("light");
      return "light";
    }

    return savedMode;
  } catch (e) {
    console.error("Error accessing localStorage:", e);
    return "light";
  }
}

/**
 * Save the theme mode to localStorage
 */
export function saveThemeMode(mode: PaletteMode): void {
  if (typeof window === "undefined") {
    return; // Do nothing during SSR
  }

  try {
    localStorage.setItem(THEME_MODE_KEY, "light");

    // Also update the HTML class for Tailwind dark mode
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

/**
 * Toggle between light and dark mode
 */
export function toggleThemeMode(currentMode: PaletteMode): PaletteMode {
  const newMode = currentMode === "light" ? "dark" : "light";
  saveThemeMode(newMode);
  return newMode;
}
