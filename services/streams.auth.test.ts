import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerifyWalletAuthArgs = vi.fn();
const mockMaybeSingle = vi.fn();
const mockIlike = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ ilike: mockIlike }));
const mockUpdate = vi.fn();
const mockUpdateSelect = vi.fn(() => ({ single: vi.fn() }));
const mockUpdateIlike = vi.fn(() => ({
  select: mockUpdateSelect,
}));

vi.mock("@/lib/auth/require-wallet", () => ({
  verifyWalletAuthArgs: (...args: unknown[]) => mockVerifyWalletAuthArgs(...args),
  WalletAuthError: class WalletAuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "WalletAuthError";
    }
  },
}));

vi.mock("@/lib/sdk/supabase/service", () => ({
  createServiceClient: vi.fn(async () => ({
    from: () => ({
      select: mockSelect,
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return { ilike: mockUpdateIlike };
      },
    }),
  })),
}));

describe("streams wallet auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redacts stream_key when owner auth is missing", async () => {
    const { getStreamByCreator } = await import("@/services/streams");

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "1",
        creator_id: "0xowner",
        stream_key: "secret-key",
        stream_id: "stream-1",
        playback_id: "playback-1",
        is_live: false,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      error: null,
    });

    const stream = await getStreamByCreator("0xowner");

    expect(stream).not.toBeNull();
    expect(stream).not.toHaveProperty("stream_key");
    expect(stream?.playback_id).toBe("playback-1");
  });

  it("returns stream_key when wallet auth matches owner", async () => {
    const { getStreamByCreator } = await import("@/services/streams");

    mockVerifyWalletAuthArgs.mockResolvedValue({ address: "0xowner" });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "1",
        creator_id: "0xowner",
        stream_key: "secret-key",
        stream_id: "stream-1",
        playback_id: "playback-1",
        is_live: false,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      error: null,
    });

    const stream = await getStreamByCreator("0xowner", {
      address: "0xowner",
      timestamp: 1,
      signature: "0xsig",
    });

    expect(stream).toMatchObject({
      stream_key: "secret-key",
      playback_id: "playback-1",
    });
  });

  it("rejects updateStream when auth address does not match creator", async () => {
    const { updateStream } = await import("@/services/streams");

    mockVerifyWalletAuthArgs.mockResolvedValue({ address: "0xattacker" });

    await expect(
      updateStream(
        "0xowner",
        { requires_metoken: false },
        { address: "0xattacker", timestamp: 1, signature: "0xsig" },
      ),
    ).rejects.toThrow("Authenticated address does not match the stream owner");

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
