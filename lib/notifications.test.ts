import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("@/lib/sdk/supabase/service", () => ({ supabaseService: mocks.db }));
import { dispatchPush, notificationInbox, subscribePush, testPush } from "./notifications";

function query(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, any> = { then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null, ...result }).then(resolve) };
  for (const name of ["select", "update", "insert", "eq", "is", "order", "limit", "maybeSingle"]) chain[name] = vi.fn(() => chain);
  mocks.db.from.mockReturnValueOnce(chain);
  return chain;
}
const delivery = { id: "delivery", attempts: 1, claim_token: "claim", subscription_id: "device", endpoint: "https://fcm.googleapis.com/test", keys: { p256dh: "key", auth: "key" }, href: "/watch/video" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUSH_VAPID_PUBLIC_KEY", "public");
  vi.stubEnv("PUSH_VAPID_PRIVATE_KEY", "private");
  mocks.db.rpc.mockResolvedValue({ data: [delivery], error: null });
});

describe("push dispatch", () => {
  it("claims across all owners and acknowledges successful sends with the current claim token", async () => {
    query({ data: { id: "device" } });
    const update = query({});
    const send = vi.fn().mockResolvedValue({ statusCode: 201 });
    expect(await dispatchPush(null, send)).toEqual({ configured: true, sent: 1, failed: 0 });
    expect(mocks.db.rpc).toHaveBeenCalledWith("claim_push_deliveries", { p_owner: null, p_limit: 20 });
    expect(update.eq).toHaveBeenCalledWith("claim_token", "claim");
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ state: "sent", last_status: 201 }));
    const payload = JSON.parse(send.mock.calls[0][1]);
    expect(payload).toMatchObject({ tag: "delivery", url: "/watch/video" });
    expect(payload.body).not.toContain("key");
  });

  it("backs off transient failures and stops after attempt five", async () => {
    for (const attempts of [1, 5]) {
      mocks.db.rpc.mockResolvedValueOnce({ data: [{ ...delivery, attempts }], error: null });
      query({ data: { id: "device" } });
      const update = query({});
      const before = Date.now();
      await dispatchPush(null, vi.fn().mockRejectedValue({ statusCode: 503 }));
      const values = update.update.mock.calls[0][0];
      expect(values.state).toBe(attempts === 5 ? "failed" : "pending");
      expect(Date.parse(values.next_attempt_at)).toBeGreaterThanOrEqual(before + 60000);
    }
  });

  it("disables expired subscriptions without leaving a pending retry", async () => {
    query({ data: { id: "device" } });
    const disable = query({});
    const settle = query({});
    expect((await dispatchPush(null, vi.fn().mockRejectedValue({ statusCode: 410 }))).failed).toBe(1);
    expect(disable.update).toHaveBeenCalledWith({ enabled: false });
    expect(settle.update).toHaveBeenCalledWith(expect.objectContaining({ state: "failed" }));
  });

  it("never sends to a device disabled after the claim", async () => {
    query({ data: null }); const settle = query({}); const send = vi.fn();
    await dispatchPush(null, send);
    expect(send).not.toHaveBeenCalled();
    expect(settle.update).toHaveBeenCalledWith(expect.objectContaining({ state: "cancelled" }));
  });

  it("does not make network requests to an unsafe stored endpoint", async () => {
    mocks.db.rpc.mockResolvedValue({ data: [{ ...delivery, endpoint: "http://127.0.0.1/secret" }], error: null });
    query({ data: { id: "device" } }); query({}); query({});
    const send = vi.fn();
    await dispatchPush(null, send);
    expect(send).not.toHaveBeenCalled();
  });

  it("reports database failures instead of returning a false successful empty inbox", async () => {
    query({ error: { message: "database down" } }); query({ count: 0 });
    await expect(notificationInbox("owner")).rejects.toThrow("temporarily unavailable");
    mocks.db.rpc.mockResolvedValue({ error: { message: "claim failed" } });
    await expect(dispatchPush()).rejects.toThrow("temporarily unavailable");
  });

  it("does not enqueue tests for a device belonging to another user", async () => {
    const lookup = query({ data: null });
    await expect(testPush("owner-a", "https://fcm.googleapis.com/b")).rejects.toThrow("Enable push");
    expect(lookup.eq).toHaveBeenCalledWith("owner_id", "owner-a");
    expect(mocks.db.from).toHaveBeenCalledTimes(1);
  });

  it("maps atomic registration conflicts to a user-facing error", async () => {
    mocks.db.rpc.mockResolvedValue({ error: { code: "P0001" } });
    await expect(subscribePush("owner", { endpoint: delivery.endpoint, keys: { p256dh: "a".repeat(87), auth: "a".repeat(22) } })).rejects.toThrow("five-device");
  });
});
