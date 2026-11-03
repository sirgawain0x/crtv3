"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/client-api";

type Activity = {
  id: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read_at: string | null;
};

function applicationKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function NotificationCenter({
  onOpen,
}: {
  onOpen: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Activity[]>([]);
  const [unread, setUnread] = useState(0);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await api("notifications");
    setItems(result.notifications);
    setUnread(result.unread);
    setPublicKey(result.publicKey);
  }, []);

  useEffect(() => {
    let active = true;
    const support =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(support);
    void load().catch(() => {
      if (active)
        setMessage("Activity could not load. Open notifications to retry.");
    });
    if (support)
      void navigator.serviceWorker
        .getRegistration("/")
        .then(async (registration) => {
          const subscription =
            await registration?.pushManager.getSubscription();
          if (subscription) {
            const status = await api("push-status", {
              endpoint: subscription.endpoint,
            });
            if (active) setEnabled(status.enabled);
          }
        })
        .catch(() => {});
    const refresh = () => {
      if (document.visibilityState === "visible") void load().catch(() => {});
    };
    const interval = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(
          "Notifications were not enabled. Your in-app inbox still works. You can change permission in browser settings.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(publicKey),
        }));
      await api("push-subscribe", subscription.toJSON());
      setEnabled(true);
      setMessage(
        "Push enabled on this device, including when the app is closed. Delivery also depends on browser and device settings.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not enable push.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api("push-unsubscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage(
        "Push disabled on this device. Your in-app inbox stays available.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not disable push.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="icon-btn notification-trigger"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => {
          setOpen(true);
          void load().catch(() =>
            setMessage("Could not load activity. Try again."),
          );
        }}
      >
        <Bell size={21} />
        {unread > 0 && (
          <span className="notification-count">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Your updates stay here after a toast disappears. Private content
              and account details are never included in lock-screen push alerts.
            </SheetDescription>
          </SheetHeader>
          <div className="notification-settings">
            {supported ? (
              <>
                <button
                  className="btn secondary w-full"
                  disabled={busy || !publicKey}
                  onClick={() => void (enabled ? disable() : enable())}
                >
                  {enabled
                    ? "Disable push on this device"
                    : "Enable push notifications"}
                </button>
                {!publicKey && (
                  <p className="text-sm text-muted-foreground">
                    Push setup is not available yet. Your inbox still works.
                  </p>
                )}
                {enabled && (
                  <button
                    className="text-btn w-full"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const result = await api("push-test", {});
                        setMessage(
                          result.queued
                            ? "Test queued for 10 seconds from now. Close the app to check background delivery. Browser or device settings may delay the alert."
                            : "The test could not be queued. Your inbox is still available.",
                        );
                        await load();
                      } catch (error) {
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : "Could not test push.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Send test in 10 seconds
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This browser does not currently expose push notifications. On
                iPhone or iPad, add Creative TV to your Home Screen and open it
                there, then enable notifications.
              </p>
            )}
            <p className="fine-print">
              You can keep the inbox without enabling push. Device permission is
              required for alerts when the app is closed.
            </p>
          </div>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          {unread > 0 && (
            <button
              className="text-btn w-full"
              onClick={async () => {
                try {
                  await api("notification-read", {});
                  await load();
                } catch {
                  setMessage("Could not mark updates as read.");
                }
              }}
            >
              Mark all as read
            </button>
          )}
          {!items.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No updates yet. Video comments, predictions, live streams,
              and upcoming events will appear here.
            </p>
          ) : (
            <ul className="notification-list">
              {items.map((item) => (
                <li key={item.id} className={item.read_at ? "" : "unread"}>
                  <button
                    onClick={async () => {
                      try {
                        await api("notification-read", { id: item.id });
                        await load();
                        setOpen(false);
                        onOpen(item.href);
                      } catch {
                        setMessage("Could not open this update. Try again.");
                      }
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                    <small>
                      Added to activity{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
