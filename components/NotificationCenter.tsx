"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { notificationApi } from "@/lib/client-api";
import { getPushRegistration, registerPushWorker } from "@/lib/push-client";
import { notificationHref } from "@/lib/push-policy";

type Activity = { id: string; title: string; body: string; href: string; created_at: string; read_at: string | null };
type Inbox = { notifications: Activity[]; unread: number; publicKey: string | null };

function applicationKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

export function NotificationCenter({ onOpen }: { onOpen: (href: string) => void }) {
  const { address, getAuthHeaders } = useWalletAuth();
  const owner = useRef(address);
  owner.current = address;
  const auth = useRef<{ owner: string; headers: Record<string, string>; expires: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    if (new URLSearchParams(window.location.search).get("notifications") === "1") setOpen(true);
  }, []);

  useEffect(() => {
    auth.current = null;
    setInbox(null);
    setEnabled(false);
    setMessage("");
  }, [address]);

  const request = useCallback(async <T,>(data?: unknown): Promise<T> => {
    if (!address) throw new Error("Connect your wallet to view notifications.");
    const headers = await getAuthHeaders();
    if (owner.current !== address) throw new Error("The connected account changed. Please retry.");
    auth.current = { owner: address, headers, expires: Number(headers["X-Wallet-Timestamp"]) * 1000 + 240000 };
    const result = await notificationApi<T>(headers, data);
    if (owner.current !== address) throw new Error("The connected account changed. Please retry.");
    return result;
  }, [address, getAuthHeaders]);

  const load = async () => {
    const result = await request<Inbox>();
    setInbox(result);
    if (supported) {
      const subscription = await (await getPushRegistration())?.pushManager.getSubscription();
      const status = subscription ? await request<{ enabled: boolean }>({ action: "push-status", endpoint: subscription.endpoint }) : { enabled: false };
      setEnabled(status.enabled);
    }
  };

  // Background refresh uses only an existing, unexpired proof. Never prompt for
  // wallet signatures on page load, timers, account changes, or window focus.
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const proof = auth.current;
      if (!proof || proof.owner !== address || proof.expires <= Date.now() || document.visibilityState !== "visible") return;
      try {
        const result = await notificationApi<Inbox>(proof.headers);
        if (active && owner.current === proof.owner) setInbox(result);
      } catch { /* Manual refresh reports errors and can renew authentication. */ }
    };
    const interval = setInterval(() => void refresh(), 30000);
    return () => { active = false; clearInterval(interval); };
  }, [address]);

  async function perform(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "That action could not be completed."); }
    finally { setBusy(false); }
  }

  async function togglePush() {
    if (enabled) {
      const subscription = await (await getPushRegistration())?.pushManager.getSubscription();
      if (subscription) {
        await request({ action: "push-unsubscribe", endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false); setMessage("Push disabled on this device. Your inbox stays available.");
      return;
    }
    if (!inbox?.publicKey) return;
    if (await Notification.requestPermission() !== "granted") {
      setMessage("Permission was not granted. You can still use the inbox, or change permission in browser settings.");
      return;
    }
    const registration = await registerPushWorker();
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const status = await request<{ enabled: boolean }>({ action: "push-status", endpoint: subscription.endpoint });
      if (!status.enabled) { await subscription.unsubscribe(); subscription = null; }
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(inbox.publicKey) });
    await request({ action: "push-subscribe", subscription: subscription.toJSON() });
    setEnabled(true); setMessage("Push enabled on this device. Delivery depends on your browser and device settings.");
  }

  return <>
    <button type="button" className="icon-btn notification-trigger" aria-label={`Notifications${inbox?.unread ? `, ${inbox.unread} unread` : ""}`} onClick={() => setOpen(true)}>
      <Bell size={21} />
      {inbox && inbox.unread > 0 ? <span className="notification-count">{inbox.unread > 99 ? "99+" : inbox.unread}</span> : null}
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Video comments and replies stay in your inbox. Push alerts contain a generic message, without comment text or account details.</SheetDescription>
        </SheetHeader>
        <div className="notification-settings">
          <button type="button" className="btn secondary w-full" disabled={busy || !address} onClick={() => void perform(load)}>
            {busy ? "Working…" : inbox ? "Refresh notifications" : "Load notifications"}
          </button>
          {!address ? <p>Connect your wallet to view notifications.</p> : !inbox ? <p className="fine-print">Verify your wallet to load your private inbox.</p> : null}
          {inbox && supported ? <>
            <button type="button" className="btn secondary w-full" disabled={busy || !inbox.publicKey} onClick={() => void perform(togglePush)}>
              {enabled ? "Disable push on this device" : "Enable push on this device"}
            </button>
            {!inbox.publicKey ? <p>Push is not configured yet. Your inbox still works.</p> : null}
            {enabled ? <button type="button" className="text-btn w-full" disabled={busy} onClick={() => void perform(async () => {
              const subscription = await (await getPushRegistration())?.pushManager.getSubscription();
              if (!subscription) throw new Error("Enable push on this device first.");
              const result = await request<{ sent: number }>({ action: "push-test", endpoint: subscription.endpoint });
              setMessage(result.sent ? "Test accepted by the push service. Check your enabled devices." : "Test queued. Delivery will be retried in the background.");
              setInbox(await request<Inbox>());
            })}>Send a test to enabled devices</button> : null}
          </> : inbox ? <p className="fine-print">This browser does not support push here. On iPhone or iPad, add Creative TV to your Home Screen and open it there.</p> : null}
        </div>
        {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
        {inbox && inbox.unread > 0 ? <button type="button" className="text-btn w-full" disabled={busy} onClick={() => void perform(async () => {
          await request({ action: "read" }); setInbox(await request<Inbox>());
        })}>Mark all as read</button> : null}
        {inbox ? inbox.notifications.length ? <ul className="notification-list">
          {inbox.notifications.map(item => <li key={item.id} className={item.read_at ? "" : "unread"}>
            <button type="button" disabled={busy} onClick={() => void perform(async () => {
              await request({ action: "read", id: item.id });
              setInbox(await request<Inbox>()); setOpen(false); onOpen(notificationHref(item.href));
            })}>
              <strong>{item.title}</strong><span>{item.body}</span>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </button>
          </li>)}
        </ul> : <p className="py-8 text-center">No updates yet. New video comments and replies will appear here.</p> : null}
      </SheetContent>
    </Sheet>
  </>;
}
