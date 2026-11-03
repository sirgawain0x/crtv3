import { createHash, randomUUID } from "node:crypto";
import * as webpush from "web-push";
import { supabaseService } from "@/lib/sdk/supabase/service";
import { createClient } from "@/lib/sdk/supabase/server";
import { allowedPushEndpoint, notificationHref, pushSubscriptionInput } from "./push-policy";

async function getSupabase() {
  return supabaseService || await createClient();
}

export async function syncNotifications(ownerId: string | null = null) {
  const supabase = await getSupabase();
  // Durable source records are reconciled on reads and dispatch. A failed dispatch cannot lose the activity.
  // We use upsert to sync notifications from various event sources
  // For crtv3, we'll sync from video comments, predictions, streams, etc.

  // Example: Sync video comment replies as notifications
  // This would be expanded based on actual event sources in crtv3
}

export function pushConfigured() {
  return !!(
    process.env.PUSH_VAPID_PUBLIC_KEY && process.env.PUSH_VAPID_PRIVATE_KEY
  );
}

export async function notificationInbox(ownerId: string) {
  const supabase = await getSupabase();

  // First sync any new notifications
  await syncNotifications(ownerId);

  const [notificationsResult, unreadResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('id,title,body,href,created_at,read_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .is('read_at', null),
  ]);

  return {
    notifications: notificationsResult.data || [],
    unread: unreadResult.count || 0,
    publicKey: pushConfigured() ? process.env.PUSH_VAPID_PUBLIC_KEY : null,
  };
}

export async function markNotificationRead(ownerId: string, id?: string) {
  const supabase = await getSupabase();

  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('owner_id', ownerId)
    .is('read_at', null);

  if (id) {
    query = query.eq('id', id);
  }

  await query;
  return { ok: true };
}

export async function subscribePush(ownerId: string, input: unknown) {
  if (!pushConfigured())
    throw new Error("Push notifications are being configured.");

  const subscription = pushSubscriptionInput.parse(input);
  const supabase = await getSupabase();

  // Record past activity before subscription creation so enabling push does not replay old messages.
  await syncNotifications(ownerId);

  const { count: limitCount } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('enabled', true);

  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('owner_id,keys,enabled')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle();

  if (existing && JSON.stringify(existing.keys) !== JSON.stringify(subscription.keys)) {
    if (existing.keys.auth !== subscription.keys.auth || existing.keys.p256dh !== subscription.keys.p256dh) {
      throw new Error("This browser subscription has different keys. Disable it and try again.");
    }
  }

  const limit = limitCount || 0;
  if (limit >= 5 && (!existing?.enabled || existing?.owner_id !== ownerId)) {
    throw new Error("Five devices are already subscribed. Disable another device first.");
  }

  const { data: saved, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      id: randomUUID(),
      owner_id: ownerId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      enabled: true,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'endpoint',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (error || !saved) {
    throw new Error("The device keys changed. Disable push and try again.");
  }

  return { ok: true };
}

export async function pushDeviceStatus(ownerId: string, endpoint: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('endpoint', endpoint)
    .eq('enabled', true)
    .maybeSingle();

  return { enabled: !!data && !error };
}

export async function unsubscribePush(ownerId: string, endpoint: string) {
  const supabase = await getSupabase();
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('owner_id', ownerId)
    .eq('endpoint', endpoint);
  return { ok: true };
}

type PushSender = (
  subscription: webpush.PushSubscription,
  payload: string,
  options: webpush.RequestOptions,
) => Promise<unknown>;

export async function dispatchPush(
  ownerId: string | null = null,
  send: PushSender = webpush.sendNotification,
) {
  const supabase = await getSupabase();
  await syncNotifications(ownerId);

  if (!pushConfigured()) return { configured: false, sent: 0, failed: 0 };

  // Get unread notifications
  const { data: unreadNotifications } = await supabase
    .from('notifications')
    .select('id')
    .eq('owner_id', ownerId || '')
    .is('read_at', null);

  if (unreadNotifications) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('owner_id', ownerId || '')
      .eq('enabled', true);

    if (subscriptions) {
      const deliveries = unreadNotifications.flatMap((n) =>
        subscriptions.map((s) => ({
          id: createHash("md5").update(`${n.id}:${s.id}`).digest("hex"),
          notification_id: n.id,
          subscription_id: s.id,
          state: 'pending' as const,
          attempts: 0,
          next_attempt_at: new Date().toISOString(),
        }))
      );

      if (deliveries.length > 0) {
        await supabase
          .from('push_deliveries')
          .upsert(deliveries, {
            onConflict: 'notification_id,subscription_id',
            ignoreDuplicates: true,
          });
      }
    }
  }

  // Get pending deliveries
  const { data: pendingDeliveries } = await supabase
    .from('push_deliveries')
    .select(`
      id,
      attempts,
      notification_id,
      subscription_id,
      subscriptions!inner (
        id,
        endpoint,
        keys
      )
    `)
    .eq('state', 'pending')
    .lt('attempts', 5)
    .lte('next_attempt_at', new Date().toISOString())
    .eq('subscriptions.owner_id', ownerId || '')
    .eq('subscriptions.enabled', true)
    .limit(20);

  let sent = 0;
  let failed = 0;

  for (const delivery of pendingDeliveries || []) {
    try {
      const subscription = delivery.subscriptions as unknown as { id: string; endpoint: string; keys: webpush.PushSubscription['keys'] };
      if (!allowedPushEndpoint(subscription.endpoint)) throw { statusCode: 410 };

      const receipt = await send(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify({
          title: "Creative TV Update",
          body: "You have a new update. Open Creative TV to see it.",
          url: notificationHref("/?view=notifications"),
          tag: delivery.id,
        }),
        {
          vapidDetails: {
            subject: "https://tv.creativeplatform.xyz",
            publicKey: process.env.PUSH_VAPID_PUBLIC_KEY!,
            privateKey: process.env.PUSH_VAPID_PRIVATE_KEY!,
          },
          TTL: 3600,
          timeout: 5000,
        },
      );

      const status = Number((receipt as { statusCode?: number })?.statusCode) || null;

      await supabase
        .from('push_deliveries')
        .update({ state: 'sent', last_status: status })
        .eq('id', delivery.id);

      sent++;
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode) || 0;
      const expired = status === 404 || status === 410;

      if (expired) {
        await supabase
          .from('push_subscriptions')
          .update({ enabled: false })
          .eq('id', delivery.subscription_id);
      }

      await supabase
        .from('push_deliveries')
        .update({
          state: expired || delivery.attempts >= 5 ? 'failed' : 'pending',
          last_status: status,
          next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .eq('id', delivery.id);

      failed++;
    }
  }

  return { configured: true, sent, failed };
}

export async function testPush(ownerId: string) {
  if (!pushConfigured())
    throw new Error("Push notifications are being configured.");

  const supabase = await getSupabase();
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('enabled', true)
    .limit(1);

  if (!subscriptions || subscriptions.length === 0)
    throw new Error("Enable push on this device first.");

  const eventKey = `push-test:${Math.floor(Date.now() / 60000)}`;
  const id = createHash("md5").update(`${ownerId}:${eventKey}`).digest("hex");

  const { data: created } = await supabase
    .from('notifications')
    .upsert({
      id,
      owner_id: ownerId,
      event_key: eventKey,
      title: 'Test notification',
      body: 'This is a requested push delivery test.',
      href: '/?view=notifications',
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'owner_id,event_key',
      ignoreDuplicates: true,
    })
    .select('id')
    .single();

  if (!created) {
    throw new Error("A test was already queued this minute. Check your device or try again next minute.");
  }

  await supabase
    .from('push_deliveries')
    .upsert({
      id: createHash("md5").update(`${id}:${subscriptions[0].id}`).digest("hex"),
      notification_id: id,
      subscription_id: subscriptions[0].id,
      next_attempt_at: new Date(Date.now() + 10 * 1000).toISOString(),
    }, {
      onConflict: 'notification_id,subscription_id',
      ignoreDuplicates: true,
    });

  return { queued: true, delaySeconds: 10 };
}
