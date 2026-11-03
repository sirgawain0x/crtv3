// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ address: "wallet-a" as string | null, headers: vi.fn(), api: vi.fn() }));
vi.mock("@/lib/auth/useWalletAuth", () => ({ useWalletAuth: () => ({ address: mocks.address, getAuthHeaders: mocks.headers }) }));
vi.mock("@/lib/client-api", () => ({ notificationApi: mocks.api }));
vi.mock("@/lib/push-client", () => ({ getPushRegistration: vi.fn().mockResolvedValue(undefined), registerPushWorker: vi.fn() }));
vi.mock("@/components/ui/sheet", () => {
  const pass = ({ children }: { children: React.ReactNode }) => children;
  return { Sheet: pass, SheetContent: pass, SheetDescription: pass, SheetHeader: pass, SheetTitle: pass };
});
import { NotificationCenter } from "./NotificationCenter";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks(); mocks.address = "wallet-a";
  mocks.headers.mockResolvedValue({ "X-Wallet-Address": "wallet-a", "X-Wallet-Timestamp": String(Math.floor(Date.now() / 1000)) });
  mocks.api.mockResolvedValue({ notifications: [{ id: "n", title: "Private update", body: "Your inbox", href: "/watch/video", created_at: new Date().toISOString(), read_at: null }], unread: 1, publicKey: null });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); });
const render = () => act(async () => { root.render(<NotificationCenter onOpen={vi.fn()} />); });
const load = () => act(async () => { [...container.querySelectorAll("button")].find(button => button.textContent === "Load notifications")!.click(); });

describe("notification wallet consent and account isolation", () => {
  it("does not ask for signatures on mount or a background refresh", async () => {
    vi.useFakeTimers(); await render();
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(mocks.headers).not.toHaveBeenCalled(); expect(mocks.api).not.toHaveBeenCalled();
  });
  it("loads on request and clears private contents on an account switch", async () => {
    await render(); await load();
    expect(mocks.headers).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Private update");
    mocks.address = "wallet-b"; await render();
    expect(container.textContent).not.toContain("Private update");
    expect(container.textContent).toContain("Load notifications");
    expect(mocks.headers).toHaveBeenCalledOnce();
  });
  it("discards an old account's response when its request finishes after a switch", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.api.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await render(); await load();
    mocks.address = "wallet-b"; await render();
    await act(async () => resolve({ notifications: [{ title: "Old private update" }], unread: 1, publicKey: null }));
    expect(container.textContent).not.toContain("Old private update");
  });
});
