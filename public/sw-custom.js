import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { skipWaiting } from "workbox-core";

skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST || []);

// Preserve push support for existing PWA registrations as well as the separate
// push registration used on Vercel (where offline/PWA generation is disabled).
importScripts("/push-sw.js");
