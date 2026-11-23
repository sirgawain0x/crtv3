/** @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  owner: "0x1111111111111111111111111111111111111111",
  auth: vi.fn(), fetch: vi.fn(), credentials: vi.fn(), create: vi.fn(),
  update: vi.fn(), targets: vi.fn(), broadcastPreferences: [] as boolean[],
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ address: mocks.owner }) }));
vi.mock("@privy-io/react-auth", () => ({ usePrivy: () => ({ ready: true }) }));
vi.mock("@/lib/hooks/accountkit/useCreatorWalletAddress", () => ({
  useCreatorWalletAddress: () => ({ creatorAddress: mocks.owner, eoaAddress: mocks.owner,
    isConnected: true, isAuthenticated: true, isLoading: false }),
}));
vi.mock("@/lib/auth/useWalletAuth", () => ({ useWalletAuth: () => ({ getAuthHeaders: mocks.auth, isReady: true }) }));
vi.mock("@/lib/hooks/unlock/useMembershipVerification", () => ({
  useMembershipVerification: () => ({ membershipDetails: null, isLoading: false }),
}));
vi.mock("@/lib/access/platform-admin", () => ({ isPlatformAdmin: () => true }));
vi.mock("@/hooks/useCreatorLiveStream", () => ({ useCreatorLiveStream: () => ({ stream: null, isLive: false }) }));
vi.mock("@/hooks/useEnsureLiveLensPost", () => ({ useEnsureLiveLensPost: () => ({ ensureLivePost: vi.fn(), isPosting: false }) }));
vi.mock("@/lib/hooks/livepeer/useLivepeerRealtimeMetrics", () => ({ useLivepeerRealtimeMetrics: () => ({ viewerCount: 0 }) }));
vi.mock("@/services/streams", () => ({ updateStream: mocks.update }));
vi.mock("@/services/video-assets", () => ({ listMultistreamTargets: mocks.targets }));
vi.mock("@/services/livepeer-thumbnails", () => ({ getThumbnailUrl: vi.fn() }));
vi.mock("@/lib/utils/logger", () => ({ logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/components/Live/Broadcast", () => ({
  fetchStreamKeyForCreator: mocks.credentials,
  createStreamViaProxy: mocks.create,
  Broadcast: ({ saveRecording, recordingSettingsReady }: { saveRecording: boolean; recordingSettingsReady: boolean }) => {
    mocks.broadcastPreferences.push(saveRecording);
    return <div data-testid="broadcast" data-recording={String(saveRecording)} data-ready={String(recordingSettingsReady)} />;
  },
}));
vi.mock("./LivePageClient", () => ({ LivePageClient: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/auth/MembershipGuard", () => ({ MembershipGuard: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/UserProfile/UserProfile", () => ({ ProfilePageGuard: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/Live/StreamHealthCard", () => ({ StreamHealthCard: () => null }));
vi.mock("@/components/Live/DigitalTwinOverlay", () => ({ DigitalTwinOverlay: () => null }));
vi.mock("@/components/Live/StreamThumbnailUploader", () => ({ StreamThumbnailUploader: () => null }));
vi.mock("@/components/Live/StreamNameEditor", () => ({ StreamNameEditor: () => null }));
vi.mock("@/components/Live/StreamMeTokenGateEditor", () => ({ StreamMeTokenGateEditor: () => null }));
vi.mock("@/components/Live/StreamIPRegistration", () => ({ StreamIPRegistration: () => null }));
vi.mock("@/components/Live/CreatorClipsList", () => ({ CreatorClipsList: () => null }));
vi.mock("@/components/Live/multicast/MultistreamTargetsForm", () => ({ MultistreamTargetsForm: () => null }));
vi.mock("@/components/Live/multicast/MultistreamTargetList", () => ({ MultistreamTargetsList: () => null }));
vi.mock("@/components/Live/LiveTokenPanel", () => ({ LiveTokenPanel: () => null }));
vi.mock("@/components/Live/LensLiveChat", () => ({ LensLiveChat: () => null }));
vi.mock("@/components/songchain/SongchainShareLiveDialog", () => ({ SongchainShareLiveDialog: () => null }));
vi.mock("@/components/Live/ModeratorsDialog", () => ({ ModeratorsDialog: () => null }));
vi.mock("@/components/Videos/ShareDialog", () => ({ ShareDialog: () => null }));

import LivePage from "./page";

describe("Live Studio recording preferences", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.owner = "0x1111111111111111111111111111111111111111";
    mocks.broadcastPreferences.length = 0;
    mocks.auth.mockResolvedValue({ "x-wallet-address": mocks.owner });
    mocks.targets.mockResolvedValue({ targets: [] });
    mocks.credentials.mockResolvedValue({ streamId: "stream-local", playbackId: "playback-local", streamKey: "test-key" });
    mocks.create.mockResolvedValue({ streamId: "stream-new", playbackId: "playback-new", streamKey: "test-new-key" });
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ playback_id: null }) });
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals();
  });
  const createButton = () => Array.from(container.querySelectorAll("button")).find(b => b.textContent === "Create Stream")!;

  it("lets a new creator choose recording off before stream creation", async () => {
    await act(async () => root.render(<LivePage />));
    const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Save live stream replay"]')!;
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    await act(async () => createButton().click());
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ creatorAddress: mocks.owner, record: false }));
    expect(container.querySelector('[data-testid="broadcast"]')?.getAttribute("data-recording")).toBe("false");
  });

  it.each([false, true])("loads saved recording=%s before credentials, without changing provider recording", async (recording) => {
    const order: string[] = [];
    mocks.fetch.mockImplementation(async () => {
      order.push("metadata");
      return { ok: true, json: async () => ({ stream_id: "stream-local", playback_id: "playback-local", save_recording: recording }) };
    });
    mocks.credentials.mockImplementation(async () => {
      order.push("credentials");
      return { streamId: "stream-local", playbackId: "playback-local", streamKey: "test-key" };
    });
    await act(async () => root.render(<LivePage />));
    expect(order).toEqual(["metadata", "credentials"]);
    expect(mocks.broadcastPreferences.length).toBeGreaterThan(0);
    expect(mocks.broadcastPreferences.every(value => value === recording)).toBe(true);
    expect(mocks.fetch.mock.calls.every(([path]) => path.startsWith("/api/streams/creator/"))).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["failed", "malformed", "missing recording preference"])("blocks creation and credentials when metadata is %s", async (failure) => {
    mocks.fetch.mockResolvedValue({ ok: failure !== "failed", status: 500,
      json: async () => failure === "malformed" ? null : { playback_id: "playback-local" } });
    await act(async () => root.render(<LivePage />));
    expect(createButton().disabled).toBe(true);
    expect(mocks.credentials).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Could not load stream settings");
  });

  it("ignores an old creator's failed metadata response after switching wallets", async () => {
    let finishOldRequest!: (value: unknown) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { finishOldRequest = resolve; }));
    await act(async () => root.render(<LivePage />));
    expect(createButton().disabled).toBe(true);
    mocks.owner = "0x2222222222222222222222222222222222222222";
    await act(async () => root.render(<LivePage />));
    expect(createButton().disabled).toBe(false);
    await act(async () => finishOldRequest({ ok: false, status: 500 }));
    expect(createButton().disabled).toBe(false);
    expect(container.textContent).not.toContain("Could not load stream settings");
  });
  it.each([true, false])("confirms recording changes only after a successful owner-authenticated response (%s)", async (ok) => {
    mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
      stream_id: "stream-local", playback_id: "playback-local", save_recording: false,
    }) });
    await act(async () => root.render(<LivePage />));
    let finishRequest!: (value: unknown) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { finishRequest = resolve; }));
    const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Save live stream replay"]')!;
    await act(async () => toggle.click());
    expect(toggle.disabled).toBe(true);
    expect(container.querySelector('[data-testid="broadcast"]')?.getAttribute("data-ready")).toBe("false");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/livepeer/stream/stream-local/recording", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-wallet-address": mocks.owner }), body: JSON.stringify({ record: true }),
    }));
    await act(async () => finishRequest({ ok, status: ok ? 200 : 502 }));
    expect(toggle.disabled).toBe(false);
    expect(container.querySelector('[data-testid="broadcast"]')?.getAttribute("data-ready")).toBe(String(ok));
    expect(toggle.getAttribute("aria-checked")).toBe(String(ok));
    if (!ok) expect(container.querySelector('[role="alert"]')?.textContent).toContain("Recording settings could not be confirmed");
  });

  it("ignores an old creator's recording response after switching wallets", async () => {
    mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ stream_id: "stream-local", playback_id: "playback-local", save_recording: false }) });
    await act(async () => root.render(<LivePage />));
    let finishOldRequest!: (value: unknown) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { finishOldRequest = resolve; }));
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Save live stream replay"]')!.click());
    const signal = mocks.fetch.mock.calls.at(-1)![1].signal as AbortSignal;
    mocks.owner = "0x2222222222222222222222222222222222222222";
    await act(async () => root.render(<LivePage />));
    expect(signal.aborted).toBe(true);
    await act(async () => finishOldRequest({ ok: false, status: 502 }));
    expect(container.textContent).not.toContain("Recording settings could not be confirmed");
    expect(createButton().disabled).toBe(false);
  });

});
