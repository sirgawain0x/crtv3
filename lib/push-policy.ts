import { z } from "zod";

export function allowedPushEndpoint(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      !u.hash &&
      ([
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(u.hostname) ||
        /^[a-z0-9-]+\.push\.apple\.com$/.test(u.hostname) ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname))
    );
  } catch {
    return false;
  }
}

export const pushSubscriptionInput = z.object({
  endpoint: z
    .string()
    .max(4096)
    .refine(allowedPushEndpoint, "This browser push service is not supported."),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});

export function notificationHref(href: string) {
  return /^(\/watch\/[A-Za-z0-9_-]+|\/\?notifications=1)$/.test(href)
    ? href
    : "/";
}
