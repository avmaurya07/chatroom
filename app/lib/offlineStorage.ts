"use client";

/**
 * Utility functions for managing offline data storage with IndexedDB
 */

// Define DB structure
interface OfflineMessage {
  id?: number;
  url: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface ChatMessage {
  _id: string;
  roomId: string;
  userId: string;
  userName: string;
  userEmoji: string;
  content: string;
  createdAt: string;
  pending?: boolean;
  synced?: boolean;
}

interface OfflineRoom {
  _id: string;
  name: string;
  lastActive: string;
  description?: string;
  createdBy?: string;
  activeUsersCount?: number;
  synced?: boolean;
}

// Open IndexedDB connection
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ChatroomOfflineDB", 1);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for offline messages that need to be synced
      if (!db.objectStoreNames.contains("offlineMessages")) {
        const store = db.createObjectStore("offlineMessages", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("roomId", "data.roomId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Store for cached messages
      if (!db.objectStoreNames.contains("chatMessages")) {
        const store = db.createObjectStore("chatMessages", { keyPath: "_id" });
        store.createIndex("roomId", "roomId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Store for rooms data
      if (!db.objectStoreNames.contains("rooms")) {
        const store = db.createObjectStore("rooms", { keyPath: "_id" });
        store.createIndex("lastActive", "lastActive", { unique: false });
      }
    };
  });
};

// Queue a message for sync when online
export const queueMessageForSync = async (
  roomId: string,
  message: Record<string, unknown>
): Promise<number | undefined> => {
  try {
    const db = await openDB();
    const tx = db.transaction("offlineMessages", "readwrite");
    const store = tx.objectStore("offlineMessages");

    const offlineMessage: OfflineMessage = {
      url: `/api/rooms/${roomId}/messages`,
      data: message,
      timestamp: Date.now(),
    };

    const result = await new Promise<IDBValidKey>((resolve, reject) => {
      const request = store.add(offlineMessage);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Also save to local messages store
    await saveMessageToLocal({
      ...(message as unknown as Partial<ChatMessage>),
      _id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pending: true,
      synced: false,
    } as ChatMessage);

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Try to register for background sync
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-messages");
    }

    return result as number;
  } catch (error) {
    console.error("Failed to queue message:", error);
    return undefined;
  }
};

// Save messages to local storage
export const saveMessageToLocal = async (
  message: ChatMessage
): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction("chatMessages", "readwrite");
    const store = tx.objectStore("chatMessages");

    await new Promise<void>((resolve, reject) => {
      const request = store.put(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to save message locally:", error);
  }
};

// Get messages for a room from local storage
export const getLocalMessages = async (
  roomId: string
): Promise<ChatMessage[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction("chatMessages", "readonly");
    const store = tx.objectStore("chatMessages");
    const index = store.index("roomId");

    const messages = await new Promise<ChatMessage[]>((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(roomId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Sort by creation date
    return messages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (error) {
    console.error("Failed to get local messages:", error);
    return [];
  }
};

// Save room data locally
export const saveRoomToLocal = async (room: OfflineRoom): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction("rooms", "readwrite");
    const store = tx.objectStore("rooms");

    await new Promise<void>((resolve, reject) => {
      const request = store.put(room);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to save room locally:", error);
  }
};

// Get all rooms from local storage
export const getLocalRooms = async (): Promise<OfflineRoom[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction("rooms", "readonly");
    const store = tx.objectStore("rooms");

    const rooms = await new Promise<OfflineRoom[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Sort by last active date, most recent first
    return rooms.sort(
      (a, b) =>
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );
  } catch (error) {
    console.error("Failed to get local rooms:", error);
    return [];
  }
};

// Get a specific room from local storage
export const getLocalRoom = async (
  roomId: string
): Promise<OfflineRoom | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction("rooms", "readonly");
    const store = tx.objectStore("rooms");

    const room = await new Promise<OfflineRoom | undefined>(
      (resolve, reject) => {
        const request = store.get(roomId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    );

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return room || null;
  } catch (error) {
    console.error("Failed to get local room:", error);
    return null;
  }
};

// Get offline message count
export const getOfflineMessageCount = async (): Promise<number> => {
  try {
    const db = await openDB();
    const tx = db.transaction("offlineMessages", "readonly");
    const store = tx.objectStore("offlineMessages");

    const count = await new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return count;
  } catch (error) {
    console.error("Failed to get offline message count:", error);
    return 0;
  }
};
