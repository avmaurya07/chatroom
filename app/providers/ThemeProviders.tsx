"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Remove the initial theme flashing prevention class after component mounts
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("theme-initializing");
    }
  }, []);

  return (
    <AppRouterCacheProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
