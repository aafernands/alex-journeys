/* Alex Journeys — installability service worker.
   Network only. This file must not cache HTML, API, auth, bookings,
   or Stays/Flights data. Older Chromium browsers still look for a fetch
   handler before they fire beforeinstallprompt; an empty handler is ignored,
   so same-origin GET navigations and static files pass straight to the network.
   API routes and Next.js data requests are not intercepted. */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.headers.has("range")) return;

  // Bookings, auth, Stays, and Flights stay on the browser's own network path.
  if (url.pathname.startsWith("/api/")) return;
  if (url.searchParams.has("_rsc")) return;
  if (request.headers.get("RSC") === "1") return;
  if (request.headers.has("Next-Router-Prefetch")) return;
  if (request.headers.has("Next-Router-State-Tree")) return;

  event.respondWith(fetch(request));
});
