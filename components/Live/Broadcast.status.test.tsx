/** @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ status: "idle", auth: vi.fn(), update: vi.fn(), fetch: vi.fn(), sources: vi.fn() }));
vi.mock("@/hooks/useBroadcast", () => ({ useBroadcast: () => ({
  status: mocks.status, videoRef: { current: null }, devices: [],
  startBroadcast: vi.fn(), stopBroadcast: vi.fn(), toggleAudio: vi.fn(), toggleVideo: vi.fn(),
  isAudioEnabled: false, isVideoEnabled: false, changeAudioDevice: vi.fn(), changeVideoDevice: vi.fn(),
  toggleScreenShare: vi.fn(), isScreenSharing: false,
}) }));
vi.mock("@/lib/auth/useWalletAuth", () => ({ useWalletAuth: () => ({ getAuthHeaders: mocks.auth }) }));
vi.mock("@/services/streams", () => ({ updateStream: mocks.update }));
vi.mock("@/lib/hooks/livepeer/useDetailPlaybackSources", () => ({ getDetailPlaybackSource: mocks.sources }));
vi.mock("@/components/Player/CreativeBrandOverlay", () => ({ CreativeBrandOverlay: () => null }));
vi.mock("@/components/Live/FloatingTipHearts", () => ({ FloatingTipHearts: () => null }));
vi.mock("@/lib/utils/logger", () => ({ logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { Broadcast } from "./Broadcast";
const owner = "0x1111111111111111111111111111111111111111";
describe("Broadcast local session status", () => {
  let root: Root; let container: HTMLDivElement;
  beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); mocks.status = "idle";
    mocks.auth.mockResolvedValue({ "x-wallet-address": owner, "x-wallet-timestamp": "1", "x-wallet-signature": "test" });
    mocks.sources.mockResolvedValue([{ type: "hls", src: "https://example.test/index.m3u8" }]);
    mocks.update.mockResolvedValue({}); mocks.fetch.mockResolvedValue({ ok: true });
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("fetch", mocks.fetch); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals();
  });
  async function render(recording = true, creator = owner, settingsReady = true) {
    await act(async () => root.render(<Broadcast streamKey="test-local-key" streamId="stream-1" playbackId="playback-1" creatorAddress={creator} saveRecording={recording} recordingSettingsReady={settingsReady} />));
  }
  it("does not mark an externally live stream offline just by opening the studio, including Strict Mode", async () => {
    await act(async () => root.render(<React.StrictMode><Broadcast streamKey="test-local-key" streamId="stream-1" creatorAddress={owner} /></React.StrictMode>));
    await act(async () => vi.advanceTimersByTimeAsync(130_000));
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not publish offline state or finalize after a failed connection", async () => {
    await render(); mocks.status = "loading"; await render(); mocks.status = "error"; await render();
    await act(async () => vi.advanceTimersByTimeAsync(130_000));
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([false, true])("tracks a real local live-to-idle session and finalizes only if recording=%s", async recording => {
    await render(recording); mocks.status = "live"; await render(recording);
    expect(mocks.update).toHaveBeenCalledWith(owner, expect.objectContaining({ is_live: true, last_live_at: expect.any(String) }), expect.anything());
    mocks.status = "idle"; await render(recording);
    expect(mocks.update).toHaveBeenLastCalledWith(owner, { is_live: false }, expect.anything());
    await act(async () => vi.advanceTimersByTimeAsync(130_000));
    expect(mocks.fetch).toHaveBeenCalledTimes(recording ? 3 : 0);
  });
  it("cancels stale live synchronization after stopping while authentication is pending", async () => {
    await render(false);
    let finishAuth!: (value: unknown) => void;
    mocks.auth.mockImplementationOnce(() => new Promise(resolve => { finishAuth = resolve; }));
    mocks.status = "live"; await render(false); mocks.status = "idle"; await render(false);
    await act(async () => finishAuth({ "x-wallet-address": owner }));
    expect(mocks.update.mock.calls.every(([, value]) => value.is_live === false)).toBe(true);
  });
  it("does not carry a previous creator's session into a new creator", async () => {
    mocks.status = "live"; await render(false); mocks.update.mockClear();
    mocks.status = "idle"; await render(false, "0x2222222222222222222222222222222222222222");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("blocks starting a broadcast when recording settings are unconfirmed", async () => {
    await act(async () => root.render(<Broadcast streamKey="test-local-key" creatorAddress={owner} recordingSettingsReady={false} />));
    const start = Array.from(container.querySelectorAll("button")).find(button => button.textContent?.includes("Go Live"));
    expect(start?.disabled).toBe(true);
  });

  it.each([false, true])("waits for a pending recording change at Stop, then honors confirmed recording=%s", async recording => {
    await render(!recording); mocks.status = "live"; await render(!recording);
    await render(!recording, owner, false);
    mocks.status = "idle"; await render(!recording, owner, false);
    await act(async () => vi.advanceTimersByTimeAsync(20_000));
    expect(mocks.fetch).not.toHaveBeenCalled();
    await render(recording, owner, true);
    await act(async () => vi.advanceTimersByTimeAsync(130_000));
    expect(mocks.fetch).toHaveBeenCalledTimes(recording ? 3 : 0);
  });

  it("loads the owner's masked RTMP destination only on request", async () => {
    await render(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Stream settings"]')!.click());
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ provider: "frameworks", rtmpUrl: "rtmp://edge.frameworks.network/live/test-local-key" }) });
    const load = Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Load streaming settings")!;
    await act(async () => load.click());
    expect(mocks.fetch).toHaveBeenCalledWith("/api/streams/ingest", expect.objectContaining({
      method: "POST", body: JSON.stringify({ creatorAddress: owner, protocol: "RTMP" }),
      headers: expect.objectContaining({ "x-wallet-address": owner }),
    }));
    const input = document.querySelector<HTMLInputElement>('#broadcast-rtmp-key')!;
    expect(input.type).toBe("password");
    expect(input.value).toBe("test-local-key");
    expect(document.querySelector<HTMLInputElement>('#broadcast-rtmp-server')?.value).toBe("rtmp://edge.frameworks.network/live/");
  });

});
