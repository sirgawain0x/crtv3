import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const CREATOR = "0xcccccccccccccccccccccccccccccccccccccccc";

const mockRequireWalletAuthFor = vi.fn();
const mockResolveStreamForCreator = vi.fn();
const mockEnsureLivepeerStreamForCreator = vi.fn();
const mockDefaultStreamCreateOptions = vi.fn();

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { standard: vi.fn(async () => null) },
}));

vi.mock("@/lib/auth/require-wallet", () => ({
  requireWalletAuthFor: (...args: unknown[]) => mockRequireWalletAuthFor(...args),
  WalletAuthError: class WalletAuthError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WalletAuthError";
    }
  },
}));

vi.mock("@/services/streams", () => ({
  resolveStreamForCreator: (...args: unknown[]) => mockResolveStreamForCreator(...args),
}));

vi.mock("@/lib/livepeer/ensure-stream", () => ({
  ensureLivepeerStreamForCreator: (...args: unknown[]) =>
    mockEnsureLivepeerStreamForCreator(...args),
  defaultStreamCreateOptions: (...args: unknown[]) =>
    mockDefaultStreamCreateOptions(...args),
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

function keyRequest(creatorAddress: string) {
  return new NextRequest(
    `http://localhost/api/livepeer/stream-key?creatorAddress=${creatorAddress}`,
  );
}

describe("GET /api/livepeer/stream-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireWalletAuthFor.mockResolvedValue({ address: CREATOR });
    mockDefaultStreamCreateOptions.mockReturnValue({
      creatorId: CREATOR,
      name: "Broadcast-1",
      profiles: [],
      record: true,
      playbackPolicy: { type: "jwt" },
    });
  });

  it("returns 404 when creator has no stream row", async () => {
    mockResolveStreamForCreator.mockResolvedValue(null);

    const res = await GET(keyRequest(CREATOR));
    expect(res.status).toBe(404);
    expect(mockEnsureLivepeerStreamForCreator).not.toHaveBeenCalled();
  });

  it("returns existing credentials when Livepeer stream is valid", async () => {
    mockResolveStreamForCreator.mockResolvedValue({
      id: "db-1",
      creator_id: CREATOR,
      stream_id: "stream-1",
      playback_id: "playback-1",
      stream_key: "key-1",
      name: "My Stream",
      save_recording: true,
    });
    mockEnsureLivepeerStreamForCreator.mockResolvedValue({
      streamId: "stream-1",
      playbackId: "playback-1",
      streamKey: "key-1",
      reused: true,
      replaced: false,
    });

    const res = await GET(keyRequest(CREATOR));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      streamId: "stream-1",
      playbackId: "playback-1",
      streamKey: "key-1",
      replaced: false,
    });
  });

  it("returns healed credentials when Livepeer stream was missing", async () => {
    mockResolveStreamForCreator.mockResolvedValue({
      id: "db-1",
      creator_id: CREATOR,
      stream_id: "dead-stream",
      playback_id: "dead-playback",
      stream_key: "dead-key",
      name: "Stale",
      save_recording: true,
    });
    mockEnsureLivepeerStreamForCreator.mockResolvedValue({
      streamId: "new-stream",
      playbackId: "new-playback",
      streamKey: "new-key",
      reused: false,
      replaced: true,
    });

    const res = await GET(keyRequest(CREATOR));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.streamKey).toBe("new-key");
    expect(json.replaced).toBe(true);
  });
});
