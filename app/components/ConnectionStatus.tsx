"use client";

import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Chip } from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import SyncIcon from "@mui/icons-material/Sync";
import { getOfflineMessageCount } from "@/app/lib/offlineStorage";

// Define an interface for the SyncManager
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

// Extend the ServiceWorkerRegistration interface
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync: SyncManager;
}

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingMessages, setPendingMessages] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updatePendingCount = async () => {
      const count = await getOfflineMessageCount();
      setPendingMessages(count);
    };

    // Initial check
    updateOnlineStatus();
    updatePendingCount();

    // Event listeners for online/offline status
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Check pending messages periodically
    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  // Sync messages when coming back online
  useEffect(() => {
    const syncMessagesIfOnline = async () => {
      if (isOnline && pendingMessages > 0) {
        try {
          setSyncing(true);
          // Trigger sync via service worker
          if ("serviceWorker" in navigator && "SyncManager" in window) {
            const registration = await navigator.serviceWorker.ready;
            // Cast to our extended interface
            await (
              registration as ExtendedServiceWorkerRegistration
            ).sync.register("sync-messages");

            // Give some time for sync to complete then check again
            setTimeout(async () => {
              const count = await getOfflineMessageCount();
              setPendingMessages(count);
              setSyncing(false);
            }, 2000);
          }
        } catch (error) {
          console.error("Failed to sync messages:", error);
          setSyncing(false);
        }
      }
    };

    syncMessagesIfOnline();
  }, [isOnline, pendingMessages]);

  // Manual sync button handler
  const handleManualSync = async () => {
    if (!isOnline) {
      return; // Can't sync if offline
    }

    try {
      setSyncing(true);
      // Trigger sync via service worker
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ExtendedServiceWorkerRegistration).sync.register(
          "sync-messages"
        );

        // Give some time for sync to complete then check again
        setTimeout(async () => {
          const count = await getOfflineMessageCount();
          setPendingMessages(count);
          setSyncing(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to sync messages:", error);
      setSyncing(false);
    }
  };

  if (isOnline && pendingMessages === 0) {
    return null; // Don't show anything if online and no pending messages
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 1,
        padding: "8px 12px",
        borderRadius: 4,
        bgcolor: isOnline ? "success.light" : "warning.light",
        boxShadow: 2,
        color: "white",
        transition: "all 0.3s ease",
      }}
    >
      {isOnline ? (
        <WifiIcon fontSize="small" />
      ) : (
        <WifiOffIcon fontSize="small" />
      )}
      <Typography variant="body2" sx={{ fontWeight: "medium" }}>
        {isOnline ? "Online" : "Offline"}
      </Typography>

      {pendingMessages > 0 && (
        <>
          <Chip
            size="small"
            label={`${pendingMessages} pending`}
            color="default"
            sx={{ height: 24, ml: 1 }}
          />

          {isOnline && (
            <Button
              size="small"
              startIcon={<SyncIcon />}
              onClick={handleManualSync}
              disabled={syncing}
              variant="contained"
              color="primary"
              sx={{
                ml: 1,
                height: 28,
                fontSize: "0.7rem",
                minWidth: "unset",
                px: 1,
                "& .MuiButton-startIcon": {
                  mr: 0.5,
                },
              }}
            >
              {syncing ? "Syncing..." : "Sync"}
            </Button>
          )}
        </>
      )}
    </Box>
  );
}
