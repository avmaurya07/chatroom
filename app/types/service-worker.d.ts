// Extend the ServiceWorkerRegistration interface to include background sync
interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

declare global {
  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }

  interface Window {
    SyncManager: SyncManager;
  }
}

export {};
