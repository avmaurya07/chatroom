"use client";

import RoomList from "./components/RoomList";
import { SocketProvider } from "./contexts/SocketContext";
import { useEffect } from "react";
import { registerServiceWorker } from "./lib/registerSW";
import InstallPrompt from "./components/InstallPrompt";

export default function Home() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <SocketProvider>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-7xl px-4">
          <RoomList />
          <InstallPrompt />
        </div>
      </main>
    </SocketProvider>
  );
}
