import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), inbox: vi.fn(), read: vi.fn(), status: vi.fn(), limited: vi.fn() }));
vi.mock("@/lib/auth/require-wallet", () => ({
  requireWalletAuth: mocks.auth,
  WalletAuthError: class extends Error { constructor(public status: number, message: string) { super(message); } },
}));
vi.mock("@/lib/middleware/rateLimit", () => ({ rateLimiters: { standard: mocks.limited } }));
vi.mock("@/lib/notifications", () => ({ notificationInbox: mocks.inbox, markNotificationRead: mocks.read,
  pushDeviceStatus: mocks.status, subscribePush: vi.fn(), unsubscribePush: vi.fn(), testPush: vi.fn() }));
import { GET, POST } from "./route";
import { WalletAuthError } from "@/lib/auth/require-wallet";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ address: "verified-wallet" });
  mocks.limited.mockResolvedValue(null);
  mocks.inbox.mockResolvedValue({ notifications: [], unread: 0, publicKey: null });
  mocks.read.mockResolvedValue({ ok: true });
});
const post = (body: unknown) => new NextRequest("https://example.com/api/notifications", {
  method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "victim" }, body: JSON.stringify(body),
});

describe("notification API ownership and contract", () => {
  it("rejects unauthenticated reads without touching the inbox", async () => {
    mocks.auth.mockRejectedValue(new WalletAuthError(401, "Missing wallet auth"));
    expect((await GET(new NextRequest("https://example.com/api/notifications?ownerId=victim"))).status).toBe(401);
    expect(mocks.inbox).not.toHaveBeenCalled();
  });
  it("ignores spoofed query/header ownership and returns the flat client contract", async () => {
    const response = await GET(new NextRequest("https://example.com/api/notifications?ownerId=victim", { headers: { "x-user-id": "victim" } }));
    expect(mocks.inbox).toHaveBeenCalledWith("verified-wallet");
    expect(await response.json()).toEqual({ notifications: [], unread: 0, publicKey: null });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("marks read only under the verified owner", async () => {
    expect((await POST(post({ action: "read", id: "notification" }))).status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith("verified-wallet", "notification");
  });
  it("rejects owner overrides and unsafe subscription endpoints", async () => {
    expect((await POST(post({ action: "read", ownerId: "victim" }))).status).toBe(400);
    expect((await POST(post({ action: "push-status", endpoint: "http://localhost" }))).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.status).not.toHaveBeenCalled();
  });
  it("does not expose database or credential errors", async () => {
    mocks.inbox.mockRejectedValue(new Error("secret database URL"));
    const response = await GET(new NextRequest("https://example.com/api/notifications"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
