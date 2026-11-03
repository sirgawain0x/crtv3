import type { AuthHeaders } from "@/lib/auth/useWalletAuth";

export type NotificationActivity = {
  id: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read_at: string | null;
};

export type NotificationInbox = {
  notifications: NotificationActivity[];
  unread: number;
  publicKey: string | null;
};

export type NotificationAction =
  | { action: "read"; id?: string }
  | { action: "push-subscribe"; subscription: { endpoint?: string; expirationTime?: number | null; keys?: Record<string, string> } }
  | { action: "push-unsubscribe" | "push-status" | "push-test"; endpoint: string };

export class NotificationApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function notificationApi<T = NotificationInbox>(
  headers: AuthHeaders,
  action?: NotificationAction,
): Promise<T> {
  const response = await fetch("/api/notifications", {
    method: action ? "POST" : "GET",
    headers: { ...headers, ...(action ? { "Content-Type": "application/json" } : {}) },
    cache: "no-store",
    body: action ? JSON.stringify(action) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new NotificationApiError(result.error || "That action could not be completed.", response.status);
  return result;
}
