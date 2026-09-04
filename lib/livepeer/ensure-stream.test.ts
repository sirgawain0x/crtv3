import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetLivepeerStreamOrNull = vi.fn();
const mockCreateLivepeerStream = vi.fn();
const mockCreateStreamRecord = vi.fn();
const mockReplaceStreamLivepeerCredentials = vi.fn();
const mockHasLivepeerPrivateApiKey = vi.fn();

vi.mock("@/lib/livepeer/studio-api", () => ({
  getLivepeerStreamOrNull: (...args: unknown[]) => mockGetLivepeerStreamOrNull(...args),
  createLivepeerStream: (...args: unknown[]) => mockCreateLivepeerStream(...args),
}));

vi.mock("@/lib/sdk/livepeer/studioAuth", () => ({
  hasLivepeerPrivateApiKey: () => mockHasLivepeerPrivateApiKey(),
}));

vi.mock("@/services/streams", () => ({
  createStreamRecord: (...args: unknown[]) => mockCreateStreamRecord(...args),
  replaceStreamLivepeerCredentials: (...args: unknown[]) =>
    mockReplaceStreamLivepeerCredentials(...args),
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { ensureLivepeerStreamForCreator } from "./ensure-stream";

const CREATOR = "0xcccccccccccccccccccccccccccccccccccccccc";

const baseOpts = {
  creatorId: CREATOR,
  name: "Test",
  profiles: [{ name: "720p", width: 1280, height: 720 }],
  record: true,
  playbackPolicy: { type: "jwt" as const },
};

describe("ensureLivepeerStreamForCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasLivepeerPrivateApiKey.mockReturnValue(true);
  });

  it("reuses credentials when Livepeer stream still exists", async () => {
    mockGetLivepeerStreamOrNull.mockResolvedValue({ id: "stream-1" });

    const result = await ensureLivepeerStreamForCreator({
      ...baseOpts,
      existing: {
        id: "db-1",
        creator_id: CREATOR,
        stream_id: "stream-1",
        playback_id: "playback-1",
        stream_key: "key-1",
        is_live: false,
        created_at: "",
        updated_at: "",
      },
    });

    expect(result).toEqual({
      streamId: "stream-1",
      playbackId: "playback-1",
      streamKey: "key-1",
      reused: true,
      replaced: false,
    });
    expect(mockCreateLivepeerStream).not.toHaveBeenCalled();
  });

  it("recreates and replaces credentials when Livepeer stream is missing", async () => {
    mockGetLivepeerStreamOrNull.mockResolvedValue(null);
    mockCreateLivepeerStream.mockResolvedValue({
      streamId: "new-stream",
      playbackId: "new-playback",
      streamKey: "new-key",
    });
    mockReplaceStreamLivepeerCredentials.mockResolvedValue({});

    const result = await ensureLivepeerStreamForCreator({
      ...baseOpts,
      existing: {
        id: "db-1",
        creator_id: CREATOR,
        stream_id: "dead-stream",
        playback_id: "dead-playback",
        stream_key: "dead-key",
        is_live: false,
        created_at: "",
        updated_at: "",
      },
    });

    expect(result.replaced).toBe(true);
    expect(result.streamKey).toBe("new-key");
    expect(mockReplaceStreamLivepeerCredentials).toHaveBeenCalledWith(CREATOR, {
      stream_id: "new-stream",
      stream_key: "new-key",
      playback_id: "new-playback",
    });
    expect(mockCreateStreamRecord).not.toHaveBeenCalled();
  });

  it("creates a new Supabase row when none exists", async () => {
    mockCreateLivepeerStream.mockResolvedValue({
      streamId: "stream-2",
      playbackId: "playback-2",
      streamKey: "key-2",
    });
    mockCreateStreamRecord.mockResolvedValue({});

    const result = await ensureLivepeerStreamForCreator({
      ...baseOpts,
      existing: null,
    });

    expect(result).toEqual({
      streamId: "stream-2",
      playbackId: "playback-2",
      streamKey: "key-2",
      reused: false,
      replaced: false,
    });
    expect(mockCreateStreamRecord).toHaveBeenCalled();
    expect(mockGetLivepeerStreamOrNull).not.toHaveBeenCalled();
  });
});
