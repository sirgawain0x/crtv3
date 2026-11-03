import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn().mockResolvedValue(undefined);
  const focus = vi.fn();
  const openWindow = vi.fn();
  const clients = { matchAll: vi.fn().mockResolvedValue([{ url: "https://example.com/", navigate, focus }]), openWindow, claim: vi.fn() };
  runInNewContext(readFileSync(new URL("../public/push-sw.js", import.meta.url), "utf8"), {
    URL, self: { location: { origin: "https://example.com" }, clients,
      registration: { showNotification }, addEventListener: (type: string, handler: any) => { handlers[type] = handler; } },
  });
  return { handlers, showNotification, navigate, focus, openWindow };
}

describe("standalone push worker", () => {
  it("displays only generic content and keeps the stable delivery tag", async () => {
    const w = worker(); let pending: Promise<unknown> = Promise.resolve();
    w.handlers.push({ data: { json: () => ({ title: "private", body: "sensitive", url: "/watch/video", tag: "delivery" }) }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
    expect(w.showNotification).toHaveBeenCalledWith("Creative TV Update", expect.objectContaining({ tag: "delivery", data: { url: "/watch/video" } }));
    expect(JSON.stringify(w.showNotification.mock.calls)).not.toContain("sensitive");
  });
  it("handles malformed payloads and prevents external navigation", async () => {
    const w = worker(); let pending: Promise<unknown> = Promise.resolve();
    w.handlers.push({ data: { json: () => { throw new Error("bad JSON"); } }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
    w.handlers.notificationclick({ notification: { close: vi.fn(), data: { url: "https://evil.example/" } }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
    expect(w.navigate).toHaveBeenCalledWith("https://example.com/?notifications=1");
    expect(w.focus).toHaveBeenCalled();
  });
});
