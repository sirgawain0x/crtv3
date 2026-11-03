"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWalletAuth, type AuthHeaders } from "@/lib/auth/useWalletAuth";
import { notificationApi, NotificationApiError, type NotificationAction, type NotificationInbox } from "@/lib/client-api";
import { getPushRegistration, registerPushWorker } from "@/lib/push-client";
import { notificationHref } from "@/lib/push-policy";

function applicationKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

type Auth = ReturnType<typeof useWalletAuth>;
type InboxApi = <T = NotificationInbox>(action?: NotificationAction) => Promise<T>;

export function NotificationCenter({ onOpen }: { onOpen: (href: string) => void }) {
  const auth = useWalletAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("notifications") === "1" || params.get("view") === "notifications") setOpen(true);
  }, []);
  // Remount before rendering another wallet's UI, including A → B → A switches.
  return <NotificationPanel key={auth.address || "signed-out"} auth={auth} open={open} setOpen={setOpen} onOpen={onOpen} />;
}

function NotificationPanel({ auth, open, setOpen, onOpen }: {
  auth: Auth; open: boolean; setOpen: (open: boolean) => void; onOpen: (href: string) => void;
}) {
  const { address, getAuthHeaders, getCachedAuthHeaders, clearAuthCache } = auth;
  const [inbox, setInbox] = useState<NotificationInbox | null>(null);
  const [needsVerification, setNeedsVerification] = useState(!getCachedAuthHeaders());
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const working = useRef(false);

  useEffect(() => {
    active.current = true;
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    return () => { active.current = false; };
  }, []);

  const execute = useCallback(async (operation: (api: InboxApi) => Promise<void>, verify = false, silent = false) => {
    if (working.current || !address) return;
    working.current = true;
    if (!silent) { setBusy(true); setMessage(""); }
    try {
      const headers: AuthHeaders | null = verify ? await getAuthHeaders() : getCachedAuthHeaders();
      if (!active.current) return;
      if (!headers) { setNeedsVerification(true); return; }
      const api: InboxApi = async <T,>(action?: NotificationAction) => {
        if (!active.current || !getCachedAuthHeaders()) throw new Error("Verify your wallet to continue.");
        const result = await notificationApi<T>(headers, action);
        if (!active.current) throw new Error("The connected account changed. Please retry.");
        return result;
      };
      await operation(api);
      if (active.current) setNeedsVerification(!getCachedAuthHeaders());
    } catch (error) {
      if (!active.current) return;
      if (error instanceof NotificationApiError && error.status === 401) {
        clearAuthCache();
        setNeedsVerification(true);
        setInbox(null);
        setEnabled(false);
      }
      if (!silent) setMessage(error instanceof Error ? error.message : "Could not load notifications. Please retry.");
    } finally {
      working.current = false;
      if (active.current && !silent) setBusy(false);
    }
  }, [address, getAuthHeaders, getCachedAuthHeaders, clearAuthCache]);

  const load = useCallback(async (api: InboxApi) => {
    const result = await api();
    setInbox(result);
    if (supported) {
      const subscription = await (await getPushRegistration())?.pushManager.getSubscription();
      if (!active.current) return;
      const status = subscription ? await api<{ enabled: boolean }>({ action: "push-status", endpoint: subscription.endpoint }) : { enabled: false };
      setEnabled(status.enabled);
    }
  }, [supported]);

  useEffect(() => {
    if (!open || !address) return;
    if (getCachedAuthHeaders()) void execute(load);
    else setNeedsVerification(true);
  }, [open, address, getCachedAuthHeaders, execute, load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (!getCachedAuthHeaders()) { setNeedsVerification(true); return; }
      void execute(load, false, true);
    };
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [getCachedAuthHeaders, execute, load]);

  async function togglePush(api: InboxApi) {
    if (enabled) {
      const subscription = await (await getPushRegistration())?.pushManager.getSubscription();
      if (!active.current) return;
      if (subscription) {
        await api({ action: "push-unsubscribe", endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      if (!active.current) return;
      setEnabled(false);
      setMessage("Push disabled on this device. Your inbox stays available.");
      return;
    }
    if (!inbox?.publicKey) return;
    if (await Notification.requestPermission() !== "granted") {
      if (active.current) setMessage("Permission was not granted. You can still use the inbox, or change permission in browser settings.");
      return;
    }
    if (!active.current) return;
    const registration = await registerPushWorker();
    if (!active.current) return;
    let subscription = await registration.pushManager.getSubscription();
    if (!active.current) return;
    if (subscription) {
      const status = await api<{ enabled: boolean }>({ action: "push-status", endpoint: subscription.endpoint });
      if (!status.enabled) {
        await subscription.unsubscribe();
        if (!active.current) return;
        subscription = null;
      }
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(inbox.publicKey) });
    await api({ action: "push-subscribe", subscription: subscription.toJSON() });
    setEnabled(true);
    setMessage("Push enabled on this device. Delivery depends on your browser and device settings.");
  }

  const unread = inbox?.unread || 0;
  return <>
    <button type="button" className="icon-btn notification-trigger" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={() => setOpen(true)}>
      <Bell size={21} />
      {unread > 0 && <span className="notification-count">{unread > 99 ? "99+" : unread}</span>}
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Video comments and replies stay in your inbox. Push alerts contain a generic message, without comment text or account details.</SheetDescription>
        </SheetHeader>
        <div className="notification-settings" aria-busy={busy}>
          {!address ? <p>Connect your wallet to view notifications.</p> : <>
            <button type="button" className="btn secondary w-full" disabled={busy || (needsVerification && !auth.isReady)} onClick={() => void execute(load, needsVerification)}>
              {busy ? "Loading notifications…" : needsVerification ? "Verify wallet" : "Refresh notifications"}
            </button>
            {needsVerification && <p className="fine-print">Verify your wallet to load your private inbox. This signature does not send a transaction.</p>}
          </>}
          {inbox && !needsVerification && (supported ? <>
            <button type="button" className="btn secondary w-full" disabled={busy || !inbox.publicKey} onClick={() => void execute(togglePush)}>{enabled ? "Disable push on this device" : "Enable push notifications"}</button>
            {!inbox.publicKey && <p className="fine-print">Push is not configured yet. Your inbox still works.</p>}
            {enabled && <button type="button" className="text-btn w-full" disabled={busy} onClick={() => void execute(async (api) => {
              const subscription = await (await getPushRegistration())?.pushManager.getSubscription();
              if (!subscription) throw new Error("Enable push on this device first.");
              const result = await api<{ sent: number }>({ action: "push-test", endpoint: subscription.endpoint });
              setMessage(result.sent ? "Test accepted by the push service. Check your enabled devices." : "Test queued. Delivery will be retried in the background.");
              await load(api);
            })}>Send a test to this device</button>}
          </> : <p className="fine-print">This browser does not support push here. On iPhone or iPad, add Creative TV to your Home Screen and open it there.</p>)}
        </div>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {inbox && !needsVerification && <>
          {unread > 0 && <button type="button" className="text-btn w-full" disabled={busy} onClick={() => void execute(async (api) => { await api({ action: "read" }); await load(api); })}>Mark all as read</button>}
          {!inbox.notifications.length ? <p className="text-sm text-muted-foreground text-center py-8">No notifications yet. Video comments and replies will appear here.</p> : <ul className="notification-list">
            {inbox.notifications.map((item) => <li key={item.id} className={item.read_at ? "" : "unread"}>
              <button type="button" disabled={busy} onClick={() => void execute(async (api) => {
                await api({ action: "read", id: item.id });
                await load(api);
                setOpen(false);
                onOpen(notificationHref(item.href));
              })}>
                <strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.created_at).toLocaleString()}</small>
              </button>
            </li>)}
          </ul>}
        </>}
      </SheetContent>
    </Sheet>
  </>;
}
