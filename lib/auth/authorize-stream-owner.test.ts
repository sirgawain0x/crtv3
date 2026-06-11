import { describe, expect, it, vi, beforeEach } from "vitest";

const mockVerifyWalletAuthArgs = vi.fn();
const mockIsLinkedWalletCompanion = vi.fn();

vi.mock("@/lib/auth/require-wallet", () => {
  class MockWalletAuthError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WalletAuthError";
    }
  }

  return {
    verifyWalletAuthArgs: (...args: unknown[]) => mockVerifyWalletAuthArgs(...args),
    WalletAuthError: MockWalletAuthError,
  };
});

vi.mock("@/lib/utils/linked-identity", () => ({
  isLinkedWalletCompanion: (...args: unknown[]) => mockIsLinkedWalletCompanion(...args),
}));

import { authorizeStreamOwner } from "./authorize-stream-owner";
import { WalletAuthError } from "./require-wallet";

const CREATOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const AUTH = {
  address: CREATOR,
  timestamp: 1_700_000_000,
  signature: "0x1234",
};

describe("authorizeStreamOwner", () => {
  beforeEach(() => {
    mockVerifyWalletAuthArgs.mockReset();
    mockIsLinkedWalletCompanion.mockReset();
  });

  it("allows when verified address matches creator", async () => {
    mockVerifyWalletAuthArgs.mockResolvedValue({ address: CREATOR });

    await expect(authorizeStreamOwner(CREATOR, AUTH)).resolves.toBe(CREATOR);
    expect(mockIsLinkedWalletCompanion).not.toHaveBeenCalled();
  });

  it("allows linked EOA↔SMA companions", async () => {
    mockVerifyWalletAuthArgs.mockResolvedValue({ address: OTHER });
    mockIsLinkedWalletCompanion.mockResolvedValue(true);

    await expect(authorizeStreamOwner(CREATOR, AUTH)).resolves.toBe(OTHER);
    expect(mockIsLinkedWalletCompanion).toHaveBeenCalledWith(OTHER, CREATOR);
  });

  it("rejects unlinked callers", async () => {
    mockVerifyWalletAuthArgs.mockResolvedValue({ address: OTHER });
    mockIsLinkedWalletCompanion.mockResolvedValue(false);

    await expect(authorizeStreamOwner(CREATOR, AUTH)).rejects.toBeInstanceOf(
      WalletAuthError,
    );
  });

  it("rejects missing auth", async () => {
    mockVerifyWalletAuthArgs.mockRejectedValue(
      new WalletAuthError(401, "Missing wallet auth"),
    );

    await expect(authorizeStreamOwner(CREATOR, undefined)).rejects.toBeInstanceOf(
      WalletAuthError,
    );
  });
});
