import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { WalletAuthError } from "@/lib/auth/require-wallet";

const createMock = vi.fn();
const mockRequireUploadCreatorWallet = vi.fn();
const mockMaybeMintUploadSessionTicket = vi.fn();

vi.mock("@/lib/video-provider", () => ({
  requireVideoProviderForUploadsAndAssets: () => ({
    assets: { create: createMock },
  }),
  FrameWorksUploadsAssetsUnavailableError: class FrameWorksUploadsAssetsUnavailableError extends Error {},
  FrameworksGraphqlUnionError: class FrameworksGraphqlUnionError extends Error {
    graphqlTypename: string;
    constructor(graphqlTypename: string, message: string) {
      super(message);
      this.graphqlTypename = graphqlTypename;
    }
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn() },
}));

vi.mock("@/lib/video-provider/upload-session-auth", () => ({
  requireUploadCreatorWallet: (...args: unknown[]) => mockRequireUploadCreatorWallet(...args),
  maybeMintUploadSessionTicket: (...args: unknown[]) => mockMaybeMintUploadSessionTicket(...args),
}));

import handler from "./request-upload";

const CREATOR = "0xdddddddddddddddddddddddddddddddddddddddd";

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end: vi.fn(),
  };
  return res as unknown as NextApiResponse & { statusCode: number; body: unknown };
}

describe("request-upload handler", () => {
  beforeEach(() => {
    createMock.mockReset();
    mockRequireUploadCreatorWallet.mockReset();
    mockMaybeMintUploadSessionTicket.mockReset();
    mockRequireUploadCreatorWallet.mockResolvedValue(CREATOR);
    mockMaybeMintUploadSessionTicket.mockReturnValue("signed-ticket");
  });

  it("returns 401 when wallet session is missing", async () => {
    mockRequireUploadCreatorWallet.mockRejectedValue(
      new WalletAuthError(401, "Missing wallet auth"),
    );

    const req = {
      method: "POST",
      headers: {},
      body: { filename: "x.mp4", filetype: "video/mp4", sizeBytes: 100 },
    } as NextApiRequest;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 403 when creator wallet check fails as forbidden", async () => {
    mockRequireUploadCreatorWallet.mockRejectedValue(
      new WalletAuthError(403, "Forbidden"),
    );

    const req = {
      method: "POST",
      headers: {
        "x-wallet-address": CREATOR,
        "x-wallet-timestamp": "1700000000",
        "x-wallet-signature": "0xsig",
      },
      body: { filename: "x.mp4", filetype: "video/mp4", sizeBytes: 100 },
    } as NextApiRequest;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("returns 401 when create raises AuthError union", async () => {
    const { FrameworksGraphqlUnionError } = await import("@/lib/video-provider");
    createMock.mockRejectedValue(new FrameworksGraphqlUnionError("AuthError", "missing scope"));

    const req = {
      method: "POST",
      headers: {},
      body: { filename: "x.mp4", filetype: "video/mp4", sizeBytes: 100 },
    } as NextApiRequest;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "missing scope" });
  });

  it("returns uploadId, partSize, and uploadTicket from createVodUpload session", async () => {
    createMock.mockResolvedValue({
      data: {
        uploadId: "vod-session-9",
        partSize: 8_388_608,
        presignedParts: [{ partNumber: 1, url: "https://s3/p1" }],
      },
    });

    const req = {
      method: "POST",
      headers: {
        "X-Wallet-Address": CREATOR,
        "X-Wallet-Timestamp": "1700000000",
        "X-Wallet-Signature": "0xsig",
      },
      body: { filename: "x.mp4", filetype: "video/mp4", sizeBytes: 12345 },
    } as NextApiRequest;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockRequireUploadCreatorWallet).toHaveBeenCalled();
    expect(mockMaybeMintUploadSessionTicket).toHaveBeenCalledWith("vod-session-9", CREATOR);
    expect(res.body).toEqual({
      uploadUrl: undefined,
      uploadId: "vod-session-9",
      partSize: 8_388_608,
      presignedParts: [{ partNumber: 1, url: "https://s3/p1" }],
      uploadTicket: "signed-ticket",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: expect.objectContaining({ value: CREATOR }),
      }),
    );
  });
});