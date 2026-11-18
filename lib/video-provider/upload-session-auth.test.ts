import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAuthError, type WalletAuthArgs } from "@/lib/auth/require-wallet";

const CREATOR = "0xdddddddddddddddddddddddddddddddddddddddd";
const OTHER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const UPLOAD_ID = "upload-abort-auth";

const mockVerifyWalletAuthArgs = vi.fn();

vi.mock("@/lib/auth/require-wallet", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth/require-wallet")>();
  return {
    ...original,
    verifyWalletAuthArgs: (...args: unknown[]) => mockVerifyWalletAuthArgs(...args),
  };
});

vi.mock("./config", () => ({
  resolveVideoProviderId: () => "frameworks",
}));

process.env.FRAMEWORKS_WEBHOOK_SECRET = "auth-test-secret";

const validAuth: WalletAuthArgs = {
  address: CREATOR,
  timestamp: 1_700_000_000,
  signature: "0x" + "33".repeat(65),
};

describe("requireUploadSessionAbort", () => {
  beforeEach(() => {
    mockVerifyWalletAuthArgs.mockReset();
  });

  it("succeeds with ticket only and no wallet auth", async () => {
    const { mintUploadSessionTicket } = await import("./upload-session-ticket");
    const { requireUploadSessionAbort } = await import("./upload-session-auth");
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    await expect(
      requireUploadSessionAbort(undefined, UPLOAD_ID, ticket),
    ).resolves.toBe(CREATOR);
    expect(mockVerifyWalletAuthArgs).not.toHaveBeenCalled();
  });

  it("succeeds with stale auth when ticket is valid", async () => {
    mockVerifyWalletAuthArgs.mockRejectedValue(new WalletAuthError(401, "too old"));
    const { mintUploadSessionTicket } = await import("./upload-session-ticket");
    const { requireUploadSessionAbort } = await import("./upload-session-auth");
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    await expect(
      requireUploadSessionAbort(validAuth, UPLOAD_ID, ticket),
    ).resolves.toBe(CREATOR);
  });

  it("returns 403 when valid auth wallet mismatches ticket creator", async () => {
    mockVerifyWalletAuthArgs.mockResolvedValue({ address: OTHER });
    const { mintUploadSessionTicket } = await import("./upload-session-ticket");
    const { requireUploadSessionAbort } = await import("./upload-session-auth");
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    await expect(requireUploadSessionAbort(validAuth, UPLOAD_ID, ticket)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("fails when ticket is missing or invalid", async () => {
    const { requireUploadSessionAbort } = await import("./upload-session-auth");
    await expect(requireUploadSessionAbort(undefined, UPLOAD_ID, "")).rejects.toMatchObject({
      status: 403,
    });
    await expect(requireUploadSessionAbort(undefined, UPLOAD_ID, "not-a-ticket")).rejects.toBeInstanceOf(
      WalletAuthError,
    );
  });
});