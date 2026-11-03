/* Standalone push worker: available on Vercel even when PWA caching is disabled. */
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Generic alert. */ }
  const href = typeof payload?.url === "string" && /^(\/watch\/[A-Za-z0-9_-]+|\/\?notifications=1)$/.test(payload.url)
    ? payload.url : "/?notifications=1";
  event.waitUntil(self.registration.showNotification("Creative TV Update", {
    body: "You have a new update. Open Creative TV to see it.",
    icon: "/icons/CreativeTV_blur-192x192.png",
    tag: typeof payload?.tag === "string" ? payload.tag : "creative-tv-update",
    data: { url: href },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const path = event.notification.data?.url;
  const href = typeof path === "string" && /^(\/watch\/[A-Za-z0-9_-]+|\/\?notifications=1)$/.test(path)
    ? path : "/?notifications=1";
  const target = new URL(href, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async windows => {
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
