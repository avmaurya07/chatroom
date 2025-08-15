"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { createTheme, PaletteMode, ThemeOptions } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { getSavedThemeMode, saveThemeMode } from "@/app/lib/themeUtils";

// Define theme settings
const getThemeSettings = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          // Light mode palette
          primary: {
            main: "#4F46E5", // Indigo shade
            light: "#818CF8",
            dark: "#3730A3",
          },
          secondary: {
            main: "#10B981", // Emerald green
            light: "#34D399",
            dark: "#059669",
          },
          background: {
            default: "#F9FAFB",
            paper: "#ffffff",
          },
          text: {
            primary: "#111827",
            secondary: "#4B5563",
          },
        }
      : {
          // Dark mode palette
          primary: {
            main: "#818CF8", // Lighter indigo for dark mode
            light: "#A5B4FC",
            dark: "#4F46E5",
          },
          secondary: {
            main: "#34D399", // Lighter emerald for dark mode
            light: "#6EE7B7",
            dark: "#10B981",
          },
          background: {
            default: "#111827",
            paper: "#1F2937",
          },
          text: {
            primary: "#F9FAFB",
            secondary: "#D1D5DB",
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none" as const,
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: "1.2rem",
        },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
});

// Create context
interface ColorModeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: "light",
  toggleColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // State to hold the current theme mode
  const [mode, setMode] = useState<PaletteMode>(() => getSavedThemeMode());

  // Function to toggle theme
  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      saveThemeMode(newMode);

      // Update HTML classes for Tailwind dark mode
      if (typeof document !== "undefined") {
        if (newMode === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }

      return newMode;
    });
  };

  // Apply theme to document element
  useEffect(() => {
    // Set the data-theme attribute on document element
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", mode);

      // Ensure Tailwind dark mode class is in sync
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [mode]);

  // Create theme based on current mode
  const theme = createTheme(getThemeSettings(mode));

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
};
