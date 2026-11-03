import { randomUUID } from "node:crypto";
import * as webpush from "web-push";
import { supabaseService } from "@/lib/sdk/supabase/service";
import { allowedPushEndpoint, notificationHref, pushSubscriptionInput } from "./push-policy";
import { NotificationError } from "./notification-errors";

function database() {
  if (!supabaseService) throw new NotificationError(503, "Notifications are not configured yet.");
  return supabaseService;
}

function checked<T extends { error: unknown }>(result: T): T {
  if (result.error) throw new NotificationError(503, "Notifications are temporarily unavailable.");
  return result;
}

export function pushConfigured() {
  return Boolean(process.env.PUSH_VAPID_PUBLIC_KEY && process.env.PUSH_VAPID_PRIVATE_KEY);
}

export async function notificationInbox(ownerId: string) {
  // Source triggers write notifications and enqueue deliveries in the same transaction.
  const db = database();
  const [inbox, unread] = await Promise.all([
    db.from("notifications").select("id,title,body,href,created_at,read_at")
      .eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(50),
    db.from("notifications").select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId).is("read_at", null),
  ]);
  checked(inbox); checked(unread);
  return {
    notifications: (inbox.data ?? []).map(item => ({ ...item, href: notificationHref(item.href) })),
    unread: unread.count ?? 0,
    publicKey: pushConfigured() ? process.env.PUSH_VAPID_PUBLIC_KEY : null,
  };
}

export async function markNotificationRead(ownerId: string, id?: string) {
  let query = database().from("notifications").update({ read_at: new Date().toISOString() })
    .eq("owner_id", ownerId).is("read_at", null);
  if (id) query = query.eq("id", id);
  checked(await query);
  return { ok: true };
}

export async function subscribePush(ownerId: string, input: unknown) {
  if (!pushConfigured()) throw new NotificationError(503, "Push notifications are not configured yet.");
  const subscription = pushSubscriptionInput.parse(input);
  // Transaction prevents concurrent registrations bypassing the device limit
  // or transferring another account's endpoint.
  const result = await database().rpc("register_push_subscription", {
    p_owner: ownerId, p_endpoint: subscription.endpoint, p_keys: subscription.keys,
  });
  if (result.error?.code === "P0001") {
    throw new NotificationError(409, "This device belongs to another account or the five-device limit was reached. Disable push on another device and retry.");
  }
  checked(result);
  return { ok: true };
}

export async function pushDeviceStatus(ownerId: string, endpoint: string) {
  const result = checked(await database().from("push_subscriptions").select("id")
    .eq("owner_id", ownerId).eq("endpoint", endpoint).eq("enabled", true).maybeSingle());
  return { enabled: Boolean(result.data) };
}

export async function unsubscribePush(ownerId: string, endpoint: string) {
  checked(await database().from("push_subscriptions").update({ enabled: false })
    .eq("owner_id", ownerId).eq("endpoint", endpoint));
  return { ok: true };
}

export type PushSender = (
  subscription: webpush.PushSubscription, payload: string, options: webpush.RequestOptions,
) => Promise<unknown>;

type Delivery = {
  id: string; attempts: number; claim_token: string; subscription_id: string;
  endpoint: string; keys: webpush.PushSubscription["keys"]; href: string;
};

export async function dispatchPush(ownerId: string | null = null, send: PushSender = webpush.sendNotification) {
  if (!pushConfigured()) return { configured: false, sent: 0, failed: 0 };
  const db = database();
  const result = checked(await db.rpc("claim_push_deliveries", { p_owner: ownerId, p_limit: 20 }));
  let sent = 0;
  let failed = 0;
  for (const delivery of (result.data ?? []) as Delivery[]) {
    const active = checked(await db.from("push_subscriptions").select("id")
      .eq("id", delivery.subscription_id).eq("enabled", true).maybeSingle());
    const settle = (values: Record<string, unknown>) => db.from("push_deliveries")
      .update({ ...values, locked_at: null, claim_token: null })
      .eq("id", delivery.id).eq("claim_token", delivery.claim_token).eq("state", "sending");
    if (!active.data) {
      checked(await settle({ state: "cancelled" }));
      continue;
    }
    let status = 0;
    let accepted = false;
    try {
      if (!allowedPushEndpoint(delivery.endpoint)) status = 410;
      else {
        const receipt = await send({ endpoint: delivery.endpoint, keys: delivery.keys }, JSON.stringify({
          title: "Creative TV Update",
          body: "You have a new update. Open Creative TV to see it.",
          url: notificationHref(delivery.href), tag: delivery.id,
        }), {
          vapidDetails: {
            subject: "https://tv.creativeplatform.xyz",
            publicKey: process.env.PUSH_VAPID_PUBLIC_KEY!, privateKey: process.env.PUSH_VAPID_PRIVATE_KEY!,
          }, TTL: 3600, timeout: 5000,
        });
        status = Number((receipt as { statusCode?: number })?.statusCode) || 201;
        accepted = status >= 200 && status < 300;
      }
    } catch (error) {
      status = Number((error as { statusCode?: number } | null)?.statusCode) || 0;
    }
    if (accepted) {
      // Failed acknowledgements leave recoverable leases. Stable tags coalesce retries;
      // a provider may accept before a process crashes (at-least-once delivery).
      checked(await settle({ state: "sent", last_status: status }));
      sent++;
    } else {
      const expired = status === 404 || status === 410;
      if (expired) checked(await db.from("push_subscriptions").update({ enabled: false })
        .eq("id", delivery.subscription_id));
      checked(await settle({
        state: expired || delivery.attempts >= 5 ? "failed" : "pending",
        last_status: status || null,
        next_attempt_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** (delivery.attempts - 1)) * 1000).toISOString(),
      }));
      failed++;
    }
  }
  return { configured: true, sent, failed };
}

export async function testPush(ownerId: string, endpoint: string) {
  if (!pushConfigured()) throw new NotificationError(503, "Push notifications are not configured yet.");
  const db = database();
  const device = checked(await db.from("push_subscriptions").select("id")
    .eq("owner_id", ownerId).eq("endpoint", endpoint).eq("enabled", true).maybeSingle());
  if (!device.data) throw new NotificationError(409, "Enable push on this device first.");
  const inserted = await db.from("notifications").insert({
    id: randomUUID(), owner_id: ownerId, event_key: `push-test:${Math.floor(Date.now() / 60000)}`,
    title: "Test notification", body: "This is a requested push delivery test.", href: "/?notifications=1",
  });
  if (inserted.error?.code === "23505") throw new NotificationError(429, "Wait one minute before sending another test.");
  checked(inserted);
  return { queued: true, ...await dispatchPush(ownerId) };
}
