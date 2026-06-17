import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyWalletAuthArgs, isLinkedWalletCompanion } = vi.hoisted(() => ({
  verifyWalletAuthArgs: vi.fn(),
  isLinkedWalletCompanion: vi.fn(),
}));

vi.mock("@/lib/auth/require-wallet", () => ({
  WalletAuthError: class WalletAuthError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WalletAuthError";
    }
  },
  verifyWalletAuthArgs: (...args: unknown[]) => verifyWalletAuthArgs(...args),
}));

vi.mock("@/lib/utils/linked-identity", () => ({
  isLinkedWalletCompanion: (...args: unknown[]) => isLinkedWalletCompanion(...args),
}));

import { WalletAuthError } from "@/lib/auth/require-wallet";
import { redactStreamKey, verifyStreamOwner } from "./verify-stream-owner";

describe("verifyStreamOwner", () => {
  beforeEach(() => {
    verifyWalletAuthArgs.mockReset();
    isLinkedWalletCompanion.mockReset();
  });

  it("allows the creator address", async () => {
    verifyWalletAuthArgs.mockResolvedValue({ address: "0xowner" });

    await expect(
      verifyStreamOwner("0xOwner", {
        address: "0xowner",
        timestamp: 1,
        signature: "0xsig",
      }),
    ).resolves.toBeUndefined();

    expect(isLinkedWalletCompanion).not.toHaveBeenCalled();
  });

  it("allows a linked smart-account companion", async () => {
    verifyWalletAuthArgs.mockResolvedValue({ address: "0xsca" });
    isLinkedWalletCompanion.mockResolvedValue(true);

    await expect(
      verifyStreamOwner("0xowner", {
        address: "0xsca",
        timestamp: 1,
        signature: "0xsig",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects unrelated callers", async () => {
    verifyWalletAuthArgs.mockResolvedValue({ address: "0xattacker" });
    isLinkedWalletCompanion.mockResolvedValue(false);

    await expect(
      verifyStreamOwner("0xowner", {
        address: "0xattacker",
        timestamp: 1,
        signature: "0xsig",
      }),
    ).rejects.toBeInstanceOf(WalletAuthError);
  });
});

describe("redactStreamKey", () => {
  it("removes stream_key from returned stream records", () => {
    const redacted = redactStreamKey({
      id: "1",
      creator_id: "0xowner",
      stream_key: "secret",
      stream_id: "sid",
      playback_id: "pid",
      is_live: false,
      created_at: "",
      updated_at: "",
    });

    expect(redacted).not.toHaveProperty("stream_key");
    expect(redacted.playback_id).toBe("pid");
  });
});
