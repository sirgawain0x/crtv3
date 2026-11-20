/** @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBroadcast } from "./useBroadcast";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), fetch: vi.fn(), refresh: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn(), warning: vi.fn(), message: vi.fn() } }));
vi.mock("@/lib/utils/logger", () => ({ logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
const destination = "https://edge.frameworks.network/whip/test-key";
const sdp = "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=rtpmap:96 H264/90000\r\n";
class Peer {
  iceGatheringState = "complete";
  localDescription: RTCSessionDescriptionInit | null = null;
  close = vi.fn(); addTrack = vi.fn();
  async createOffer() { return { type: "offer", sdp }; }
  async setLocalDescription(value: RTCSessionDescriptionInit) { this.localDescription = value; }
  async setRemoteDescription() {}
}
describe("provider-aware browser publishing", () => {
  let root: Root; let container: HTMLDivElement; let api: ReturnType<typeof useBroadcast>; let mounted: boolean;
  function Harness() { api = useBroadcast({ streamKey: "test-key", resolveIngest: mocks.resolve, refreshStreamKey: mocks.refresh }); return null; }
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.resolve.mockResolvedValue({ provider: "frameworks", whipUrl: destination });
    mocks.fetch.mockImplementation(async () => new Response(sdp, { status: 201, headers: { Location: "/whip/resource/test-session" } }));
    const track = { readyState: "live", stop: vi.fn(), enabled: true };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [track] };
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(async () => stream), enumerateDevices: vi.fn(async () => []), addEventListener: vi.fn(), removeEventListener: vi.fn() } });
    vi.stubGlobal("RTCPeerConnection", Peer);
    vi.stubGlobal("RTCSessionDescription", class { constructor(value: RTCSessionDescriptionInit) { Object.assign(this, value); } });
    vi.stubGlobal("fetch", mocks.fetch); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div"); document.body.append(container); root = createRoot(container); mounted = true;
  });
  afterEach(async () => { if (mounted) await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  async function render() { await act(async () => root.render(<Harness />)); }
  it("resolves on Go Live and posts directly to the FrameWorks destination without Livepeer discovery", async () => {
    await render(); expect(mocks.resolve).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
    await act(async () => api.startBroadcast());
    expect(api.status).toBe("live");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith(destination, expect.objectContaining({ method: "POST", body: expect.stringContaining("m=video") }));
  });
  it("does not recreate a FrameWorks stream after a WHIP 404", async () => {
    mocks.fetch.mockResolvedValue(new Response("private upstream body", { status: 404 }));
    await render(); await act(async () => api.startBroadcast());
    expect(api.status).toBe("idle"); expect(mocks.refresh).not.toHaveBeenCalled();
    expect(api.error).not.toContain("private upstream body");
  });
  it("preserves Livepeer HEAD discovery when the server selects Livepeer", async () => {
    const url = "https://playback.livepeer.studio/webrtc/test-key";
    mocks.resolve.mockResolvedValue({ provider: "livepeer", whipUrl: url });
    await render(); await act(async () => api.startBroadcast());
    expect(mocks.fetch).toHaveBeenNthCalledWith(1, url, expect.objectContaining({ method: "HEAD" }));
    expect(mocks.fetch).toHaveBeenNthCalledWith(2, url, expect.objectContaining({ method: "POST" }));
    expect(api.status).toBe("live");
  });
  it("fails closed if placement cannot be resolved", async () => {
    mocks.resolve.mockRejectedValue(new Error("Destination unavailable"));
    await render(); await act(async () => api.startBroadcast());
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.refresh).not.toHaveBeenCalled(); expect(api.status).toBe("idle");
  });
  it("deletes the same-origin WHIP resource on Stop", async () => {
    await render(); await act(async () => api.startBroadcast()); await act(async () => api.stopBroadcast());
    expect(mocks.fetch).toHaveBeenLastCalledWith("https://edge.frameworks.network/whip/resource/test-session", { method: "DELETE" });
    expect(api.status).toBe("idle");
  });
  it("does not send cleanup requests to a cross-origin Location", async () => {
    mocks.fetch.mockResolvedValue(new Response(sdp, { status: 201, headers: { Location: "https://other.example/resource" } }));
    await render(); await act(async () => api.startBroadcast()); await act(async () => api.stopBroadcast());
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("does not connect an obsolete creator after unmount during placement resolution", async () => {
    let finish!: (value: unknown) => void;
    mocks.resolve.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await render(); let pending!: Promise<void>;
    await act(async () => { pending = api.startBroadcast(); });
    await act(async () => root.unmount()); mounted = false;
    await act(async () => { finish({ provider: "frameworks", whipUrl: destination }); await pending; });
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
  });
  it("still refreshes stale Livepeer credentials once and resolves their new destination", async () => {
    const oldUrl = "https://playback.livepeer.studio/webrtc/old-key";
    const newUrl = "https://playback.livepeer.studio/webrtc/new-key";
    mocks.resolve.mockResolvedValueOnce({ provider: "livepeer", whipUrl: oldUrl }).mockResolvedValueOnce({ provider: "livepeer", whipUrl: newUrl });
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    mocks.refresh.mockResolvedValue("new-key");
    await render(); await act(async () => api.startBroadcast());
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenNthCalledWith(2, newUrl, expect.objectContaining({ method: "HEAD" }));
    expect(mocks.fetch).toHaveBeenNthCalledWith(3, newUrl, expect.objectContaining({ method: "POST" }));
    expect(api.status).toBe("live");
  });

  it("cleans up a WHIP resource returned after the studio unmounts", async () => {
    let finish!: (response: Response) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await render(); let pending!: Promise<void>;
    await act(async () => { pending = api.startBroadcast(); });
    await act(async () => root.unmount()); mounted = false;
    await act(async () => { finish(new Response(sdp, { status: 201, headers: { Location: "/whip/resource/late-session" } })); await pending; });
    expect(mocks.fetch).toHaveBeenLastCalledWith("https://edge.frameworks.network/whip/resource/late-session", { method: "DELETE" });
    expect(mocks.error).not.toHaveBeenCalled();
  });

});
