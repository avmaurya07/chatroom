// public/sw.js
const CACHE_NAME = "chatroom-v2";
const STATIC_CACHE_NAME = "chatroom-static-v2";
const DYNAMIC_CACHE_NAME = "chatroom-dynamic-v2";
const MESSAGE_STORE_NAME = "chatroom-messages";

// Static assets to cache during installation
const urlsToCache = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/logo.svg",
  "/file.svg",
  "/globe.svg",
  "/window.svg",
  "/next.svg",
  "/vercel.svg",
  "/globals.css",
  "/roomStyles.css",
  "/sw.js",
  "/offline.html",
  "/404.html",
];

// No need to dynamically create an offline page as we have a static offline.html file

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      }),
    ])
  );
  self.skipWaiting(); // Activate the new service worker immediately
});

self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API request handling with network-first strategy
  if (event.request.url.includes("/api/")) {
    // For API routes, use network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            // Only cache successful responses
            if (response.status === 200) {
              cache.put(event.request, responseToCache);
            }
          });
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              // Return cached response
              return cachedResponse;
            }

            // For message POST requests that fail, store them in IndexedDB for later sync
            if (
              event.request.method === "POST" &&
              event.request.url.includes("/messages")
            ) {
              // Handle offline message posting (implemented in the page)
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Offline - Message queued for delivery",
                }),
                {
                  headers: { "Content-Type": "application/json" },
                }
              );
            }

            // If it's a navigation request, return the offline page
            if (event.request.mode === "navigate") {
              return caches.match("/offline.html").then((response) => {
                return response || caches.match("/");
              });
            }

            return new Response("Offline - Data not available");
          });
        })
    );
  } else {
    // For non-API routes, try cache first, then network
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }

        // Not in cache - fetch and cache the result
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.type !== "basic") {
              return response;
            }

            // Handle 404 responses
            if (response.status === 404 && event.request.mode === "navigate") {
              return caches.match("/404.html");
            }

            // If it's a good response, cache it
            if (response.status === 200) {
              // Clone the response because it's a stream and can only be consumed once
              const responseToCache = response.clone();

              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }

            return response;

            return response;
          })
          .catch(() => {
            // If it's a navigation request, return the offline page
            if (event.request.mode === "navigate") {
              return caches.match("/offline.html").then((response) => {
                return response || caches.match("/");
              });
            }

            // For image resources, return a fallback
            if (event.request.destination === "image") {
              return caches.match("/favicon.svg");
            }

            // Default empty response
            return new Response("Resource not available offline");
          });
      })
    );
  }
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim any clients immediately
  return self.clients.claim();
});

// Listen for the sync event to send queued messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages());
  }
});

// Function to sync queued messages when online
async function syncMessages() {
  try {
    // Open the IndexedDB database
    const db = await openDB();
    const tx = db.transaction("offlineMessages", "readwrite");
    const store = tx.objectStore("offlineMessages");

    // Get all offline messages
    const messages = await store.getAll();

    // Send each message to the server
    const sendPromises = messages.map(async (message) => {
      try {
        const response = await fetch(message.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message.data),
        });

        if (response.ok) {
          // Message sent successfully, remove from queue
          await store.delete(message.id);
          return { success: true, message: message.data };
        }
        return {
          success: false,
          error: "Failed to send message",
          message: message.data,
        };
      } catch (error) {
        return {
          success: false,
          error: "Network error",
          message: message.data,
        };
      }
    });

    const results = await Promise.all(sendPromises);
    await tx.complete;
    return results;
  } catch (error) {
    console.error("Sync failed:", error);
    return [];
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ChatroomOfflineDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offlineMessages")) {
        const store = db.createObjectStore("offlineMessages", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("roomId", "data.roomId", { unique: false });
        store.createIndex("createdAt", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains("chatMessages")) {
        const store = db.createObjectStore("chatMessages", { keyPath: "_id" });
        store.createIndex("roomId", "roomId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}
