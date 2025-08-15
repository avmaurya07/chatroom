"use client";

import { useState, useEffect } from "react";

// Define a type for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Save the event to trigger it later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom install button
      setShowInstallPrompt(true);
    });

    // Hide the prompt if the app is already installed
    window.addEventListener("appinstalled", () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", () => {});
      window.removeEventListener("appinstalled", () => {});
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
      // We no longer need the prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    });
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 z-50">
      <div className="flex flex-col gap-3">
        <div className="font-semibold text-gray-900 dark:text-white">
          Install Chatroom App
        </div>
        <div className="text-gray-600 dark:text-gray-300 text-sm">
          Install this app on your device for a better experience
        </div>
        <div className="flex justify-between">
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
