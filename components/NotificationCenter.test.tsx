// @vitest-environment jsdom
/* global globalThis */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearWalletAuth, requestWalletAuth, setWalletAuthOwner } from "@/lib/auth/wallet-auth-cache";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const mocks = vi.hoisted(() => ({ address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as string | null, sign: vi.fn(), fetch: vi.fn(), client: {} }));
vi.mock("@/lib/wallet/react", () => ({
  useUser: () => mocks.address ? { address: mocks.address } : null,
  useSignMessage: () => ({ signMessage: mocks.sign }),
}));
vi.mock("@/lib/hooks/accountkit/useModularAccount", () => ({ default: () => ({ address: mocks.address, smartAccountClient: mocks.client }) }));
vi.mock("lucide-react", () => ({ Bell: () => null }));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? children : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
import { NotificationCenter } from "./NotificationCenter";
let root: Root;
let container: HTMLDivElement;
const onOpen = vi.fn();
const inbox = { notifications: [{ id: "n1", title: "Private comment", body: "Account A only", href: "/watch/video1", created_at: "2026-11-02T12:00:00Z", read_at: null }], unread: 1, publicKey: null };
function reply(data: unknown, status = 200) { return { ok: status < 400, status, json: async () => data }; }
function button(label: string) {
  const found = Array.from(container.querySelectorAll("button")).find((node) => node.textContent === label || node.getAttribute("aria-label") === label);
  if (!found) throw new Error(`Missing button: ${label}. ${container.textContent}`);
  return found;
}
async function click(label: string) { await act(async () => { button(label).click(); }); }
async function render() { await act(async () => { root.render(<NotificationCenter onOpen={onOpen} />); }); }
async function prime() { setWalletAuthOwner(A); await requestWalletAuth(A, async () => "0xcached"); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  vi.clearAllMocks();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  mocks.address = A;
  mocks.sign.mockResolvedValue("0xverified");
  mocks.fetch.mockResolvedValue(reply(inbox));
  vi.stubGlobal("fetch", mocks.fetch);
  clearWalletAuth(); setWalletAuthOwner("");
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); Reflect.deleteProperty(navigator, "serviceWorker"); vi.unstubAllGlobals(); vi.useRealTimers(); });

function supportPush(enabled = false) {
  const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/example", toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/example", keys: { auth: "a".repeat(22), p256dh: "b".repeat(87) } }), unsubscribe: vi.fn().mockResolvedValue(true) };
  const registration = {
    scope: new URL("/notifications/", window.location.origin).href,
    active: {},
    pushManager: { getSubscription: vi.fn().mockResolvedValue(enabled ? subscription : null), subscribe: vi.fn().mockResolvedValue(subscription) },
  };
  const worker = { getRegistrations: vi.fn().mockResolvedValue([registration]), register: vi.fn().mockResolvedValue(registration) };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: worker });
  const permission = vi.fn().mockResolvedValue("granted");
  vi.stubGlobal("Notification", { requestPermission: permission });
  vi.stubGlobal("PushManager", class {});
  mocks.fetch.mockImplementation(async (_url, options) => {
    const action = options.body ? JSON.parse(options.body).action : null;
    return reply(action === "push-status" ? { enabled } : action ? { ok: true } : { ...inbox, publicKey: "AAAA" });
  });
  return { subscription, worker, permission };
}

describe("notification inbox authentication", () => {
  it("opens directly with proof from another consumer and never signs", async () => {
    await prime(); await render(); await click("Notifications");
    expect(container.textContent).toContain("Private comment");
    expect(container.textContent).not.toContain("Verify wallet");
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith("/api/notifications", expect.objectContaining({ method: "GET", cache: "no-store", headers: expect.objectContaining({ "X-Wallet-Address": A, "X-Wallet-Signature": "0xcached" }) }));
  });
  it("requires an explicit verification action then loads immediately", async () => {
    await render(); await click("Notifications");
    expect(button("Verify wallet").disabled).toBe(false);
    expect(mocks.sign).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
    await click("Verify wallet");
    expect(mocks.sign).toHaveBeenCalledOnce(); expect(container.textContent).toContain("Private comment");
  });
  it("allows retry after the user cancels verification", async () => {
    mocks.sign.mockRejectedValueOnce(new Error("Signature cancelled"));
    await render(); await click("Notifications"); await click("Verify wallet");
    expect(container.textContent).toContain("Signature cancelled"); expect(mocks.fetch).not.toHaveBeenCalled();
    await click("Verify wallet"); expect(container.textContent).toContain("Private comment");
  });
  it("never prompts when proof expires during background refresh", async () => {
    vi.useFakeTimers(); await prime(); await render(); await click("Notifications");
    await act(async () => { vi.advanceTimersByTime(5 * 60 * 1000); });
    expect(container.textContent).toContain("Verify wallet"); expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("clears private data and unread badges on logout", async () => {
    await prime(); await render(); await click("Notifications");
    mocks.address = null; await render();
    expect(container.textContent).not.toContain("Private comment");
    expect(container.textContent).toContain("Connect your wallet");
    expect(container.querySelector(".notification-count")).toBeNull();
  });
  it("ignores a late response after A → B → A", async () => {
    let resolve!: (response: ReturnType<typeof reply>) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await prime(); await render(); await click("Notifications");
    expect(container.textContent).toContain("Loading notifications");
    mocks.address = B; await render(); mocks.address = A; await render();
    await act(async () => { resolve(reply(inbox)); });
    expect(container.textContent).not.toContain("Private comment"); expect(container.textContent).toContain("Verify wallet");
  });
  it("shows fetch errors with retry rather than an empty inbox", async () => {
    mocks.fetch.mockResolvedValueOnce(reply({ error: "Service unavailable" }, 503));
    await prime(); await render(); await click("Notifications");
    expect(container.textContent).toContain("Service unavailable"); expect(container.textContent).not.toContain("No notifications yet");
    await click("Refresh notifications"); expect(container.textContent).toContain("Private comment");
  });
  it("requires verification again when the server rejects cached proof", async () => {
    mocks.fetch.mockResolvedValueOnce(reply({ error: "Invalid signature" }, 401));
    await prime(); await render(); await click("Notifications");
    expect(container.textContent).toContain("Verify wallet"); expect(mocks.sign).not.toHaveBeenCalled();
    await click("Verify wallet"); expect(container.textContent).toContain("Private comment");
  });
  it("marks all read and refreshes the unread badge", async () => {
    await prime(); await render(); await click("Notifications");
    mocks.fetch.mockResolvedValueOnce(reply({ ok: true })).mockResolvedValueOnce(reply({ ...inbox, unread: 0 }));
    await click("Mark all as read");
    expect(mocks.fetch).toHaveBeenCalledWith("/api/notifications", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "read" }) }));
    expect(container.querySelector(".notification-count")).toBeNull();
  });
  it("shows an empty inbox only after a successful load", async () => {
    mocks.fetch.mockResolvedValue(reply({ ...inbox, notifications: [], unread: 0 }));
    await prime(); await render(); await click("Notifications"); expect(container.textContent).toContain("No notifications yet");
  });
  it("keeps push permission separate and enables the scoped worker on demand", async () => {
    const { worker, permission } = supportPush();
    await prime(); await render(); await click("Notifications");
    expect(permission).not.toHaveBeenCalled();
    await click("Enable push notifications");
    expect(permission).toHaveBeenCalledOnce();
    expect(worker.register).toHaveBeenCalledWith("/push-sw.js", { scope: "/notifications/" });
    expect(container.textContent).toContain("Disable push on this device");
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("keeps the private inbox available when push permission is denied", async () => {
    const { worker, permission } = supportPush(); permission.mockResolvedValue("denied");
    await prime(); await render(); await click("Notifications"); await click("Enable push notifications");
    expect(worker.register).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Permission was not granted");
    expect(container.textContent).toContain("Private comment");
  });
  it("disables only this device's subscription", async () => {
    const { subscription } = supportPush(true);
    await prime(); await render(); await click("Notifications"); await click("Disable push on this device");
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledWith("/api/notifications", expect.objectContaining({ body: JSON.stringify({ action: "push-unsubscribe", endpoint: subscription.endpoint }) }));
    expect(container.textContent).toContain("Private comment");
  });

});
