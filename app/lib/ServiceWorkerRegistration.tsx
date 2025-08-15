"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "./registerSW";

export default function ServiceWorkerRegistration({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Register service worker for offline functionality
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
