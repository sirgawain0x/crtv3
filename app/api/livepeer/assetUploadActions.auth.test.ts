import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAuthError, type WalletAuthArgs } from "@/lib/auth/require-wallet";

const CREATOR = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER = "0xcccccccccccccccccccccccccccccccccccccccc";
const UPLOAD_ID = "upload-auth-test";

const mockCreate = vi.fn();
const mockCompleteUpload = vi.fn();
const mockAbortUpload = vi.fn();

vi.mock("@/lib/video-provider", () => ({
  requireVideoProviderForUploadsAndAssets: () => ({
    assets: {
      create: mockCreate,
      completeUpload: mockCompleteUpload,
      abortUpload: mockAbortUpload,
    },
  }),
  FrameWorksUploadsAssetsUnavailableError: class extends Error {},
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), warn: vi.fn() },
}));

const mockVerifyWalletAuthArgs = vi.fn();
vi.mock("@/lib/auth/require-wallet", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth/require-wallet")>();
  return {
    ...original,
    verifyWalletAuthArgs: (...args: unknown[]) => mockVerifyWalletAuthArgs(...args),
  };
});

vi.mock("@/lib/video-provider/config", () => ({
  resolveVideoProviderId: () => "frameworks",
}));

process.env.FRAMEWORKS_WEBHOOK_SECRET = "actions-auth-test-secret";

const authArgs: WalletAuthArgs = {
  address: CREATOR,
  timestamp: 1_700_000_000,
  signature: "0x" + "11".repeat(65),
};

describe("assetUploadActions wallet auth", () => {
  beforeEach(() => {
    mockVerifyWalletAuthArgs.mockReset();
    mockCreate.mockReset();
    mockCompleteUpload.mockReset();
    mockAbortUpload.mockReset();
  });

  describe("getLivepeerUploadUrl", () => {
    it("returns 401 when session is missing", async () => {
      mockVerifyWalletAuthArgs.mockRejectedValue(
        new WalletAuthError(401, "Missing wallet auth"),
      );
      const { getLivepeerUploadUrl } = await import("./assetUploadActions");
      await expect(
        getLivepeerUploadUrl(authArgs, "file.mp4", CREATOR, 100),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("binds creator from session wallet, not the client-supplied address", async () => {
      mockVerifyWalletAuthArgs.mockResolvedValue({ address: OTHER });
      mockCreate.mockResolvedValue({
        data: { uploadId: UPLOAD_ID, asset: { id: "a1" } },
      });
      const { getLivepeerUploadUrl } = await import("./assetUploadActions");
      const session = await getLivepeerUploadUrl(authArgs, "file.mp4", CREATOR, 100);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          creatorId: expect.objectContaining({ value: OTHER }),
        }),
      );
      expect(session?.uploadTicket).toBeDefined();
    });

    it("succeeds with verified wallet and mints upload ticket", async () => {
      mockVerifyWalletAuthArgs.mockResolvedValue({ address: CREATOR });
      mockCreate.mockResolvedValue({
        data: { uploadId: UPLOAD_ID, asset: { id: "asset-1" } },
      });
      const { getLivepeerUploadUrl } = await import("./assetUploadActions");
      const session = await getLivepeerUploadUrl(authArgs, "file.mp4", CREATOR, 512);
      expect(session?.uploadId).toBe(UPLOAD_ID);
      expect(session?.uploadTicket).toBeTypeOf("string");
    });
  });

  describe("completeFrameworksVodUpload", () => {
    it("returns 401 without wallet auth", async () => {
      mockVerifyWalletAuthArgs.mockRejectedValue(
        new WalletAuthError(401, "Missing wallet auth"),
      );
      const { completeFrameworksVodUpload } = await import("./assetUploadActions");
      await expect(
        completeFrameworksVodUpload(authArgs, UPLOAD_ID, [{ partNumber: 1, etag: '"a"' }], "ticket"),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("returns 403 for wrong wallet vs ticket", async () => {
      mockVerifyWalletAuthArgs.mockResolvedValue({ address: OTHER });
      const { mintUploadSessionTicket } = await import(
        "@/lib/video-provider/upload-session-ticket"
      );
      const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
      const { completeFrameworksVodUpload } = await import("./assetUploadActions");
      await expect(
        completeFrameworksVodUpload(
          authArgs,
          UPLOAD_ID,
          [{ partNumber: 1, etag: '"a"' }],
          ticket,
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("succeeds for ticket owner", async () => {
      mockVerifyWalletAuthArgs.mockResolvedValue({ address: CREATOR });
      const { mintUploadSessionTicket } = await import(
        "@/lib/video-provider/upload-session-ticket"
      );
      const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
      mockCompleteUpload.mockResolvedValue({ data: { id: UPLOAD_ID } });
      const { completeFrameworksVodUpload } = await import("./assetUploadActions");
      await completeFrameworksVodUpload(
        authArgs,
        UPLOAD_ID,
        [{ partNumber: 1, etag: '"etag"' }],
        ticket,
      );
      expect(mockCompleteUpload).toHaveBeenCalledWith({
        uploadId: UPLOAD_ID,
        parts: [{ partNumber: 1, etag: '"etag"' }],
      });
    });
  });

  describe("abortFrameworksVodUpload", () => {
    it("succeeds with valid ticket and no wallet auth", async () => {
      const { mintUploadSessionTicket } = await import(
        "@/lib/video-provider/upload-session-ticket"
      );
      const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
      const { abortFrameworksVodUpload } = await import("./assetUploadActions");
      await abortFrameworksVodUpload(undefined, UPLOAD_ID, ticket);
      expect(mockAbortUpload).toHaveBeenCalledWith(UPLOAD_ID);
      expect(mockVerifyWalletAuthArgs).not.toHaveBeenCalled();
    });

    it("returns 403 when valid auth wallet mismatches ticket creator", async () => {
      mockVerifyWalletAuthArgs.mockResolvedValue({ address: OTHER });
      const { mintUploadSessionTicket } = await import(
        "@/lib/video-provider/upload-session-ticket"
      );
      const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
      const { abortFrameworksVodUpload } = await import("./assetUploadActions");
      await expect(
        abortFrameworksVodUpload(authArgs, UPLOAD_ID, ticket),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("fails when ticket is missing or invalid", async () => {
      const { abortFrameworksVodUpload } = await import("./assetUploadActions");
      await expect(abortFrameworksVodUpload(undefined, UPLOAD_ID, "")).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        abortFrameworksVodUpload(undefined, UPLOAD_ID, "bad-ticket"),
      ).rejects.toMatchObject({ status: expect.any(Number) });
    });

    it("succeeds with stale auth when ticket is valid", async () => {
      mockVerifyWalletAuthArgs.mockRejectedValue(new WalletAuthError(401, "too old"));
      const { mintUploadSessionTicket } = await import(
        "@/lib/video-provider/upload-session-ticket"
      );
      const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
      const { abortFrameworksVodUpload } = await import("./assetUploadActions");
      await abortFrameworksVodUpload(authArgs, UPLOAD_ID, ticket);
      expect(mockAbortUpload).toHaveBeenCalledWith(UPLOAD_ID);
    });
  });
});