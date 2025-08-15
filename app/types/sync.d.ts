// Type definitions for Background Sync API
// This is an experimental API, and we need to extend the existing types

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }

  interface Window {
    SyncManager: SyncManager;
  }
}
