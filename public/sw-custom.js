import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { skipWaiting } from "workbox-core";

skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);

// Push notification handler
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification("Creative TV Update", {
      body: "You have a new update. Open Creative TV to see it.",
      icon: "/icons/CreativeTV_blur-192x192.png",
      tag: typeof payload.tag === "string" ? payload.tag : "creative-tv-update",
      data: { url: typeof payload.url === "string" ? payload.url : "/" },
    }),
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  const target =
    url.origin === self.location.origin ? url.href : self.location.origin;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        for (const client of windows)
          if (new URL(client.url).origin === self.location.origin) {
            await client.navigate(target);
            return client.focus();
          }
        return clients.openWindow(target);
      }),
  );
});
