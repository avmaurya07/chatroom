"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        // Ensure socket API endpoint is set up first
        await fetch("/api/socket");

        // Create socket connection
        const socketUrl = window.location.origin;
        console.log("Connecting to socket at:", socketUrl);

        const socketInstance = io(socketUrl, {
          path: "/api/socket",
          transports: ["polling", "websocket"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 30000,
          forceNew: true,
        });

        socketInstance.on("connect", () => {
          setIsConnected(true);
          console.log("Socket connected successfully");
        });

        socketInstance.on("disconnect", () => {
          setIsConnected(false);
          console.log("Socket disconnected");
        });

        socketInstance.on("connect_error", (err) => {
          console.error("Socket connection error:", err.message);
        });

        socketInstance.on("error", (err) => {
          console.error("Socket error:", err);
        });

        setSocket(socketInstance);

        return socketInstance;
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        return null;
      }
    };

    let socketInstance: Socket | null = null;

    initSocket().then((instance) => {
      socketInstance = instance;
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
