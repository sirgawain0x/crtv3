import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const createMock = vi.fn();

vi.mock("@/lib/video-provider", () => ({
  requireVideoProviderForUploadsAndAssets: () => ({
    assets: { create: createMock },
  }),
  FrameWorksUploadsAssetsUnavailableError: class FrameWorksUploadsAssetsUnavailableError extends Error {},
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn() },
}));

import handler from "./request-upload";

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
  });

  it("returns uploadId and partSize from createVodUpload session", async () => {
    createMock.mockResolvedValue({
      data: {
        uploadId: "vod-session-9",
        partSize: 8_388_608,
        presignedParts: [{ partNumber: 1, url: "https://s3/p1" }],
      },
    });

    const req = {
      method: "POST",
      body: { filename: "x.mp4", filetype: "video/mp4", sizeBytes: 12345 },
    } as NextApiRequest;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      uploadUrl: undefined,
      uploadId: "vod-session-9",
      partSize: 8_388_608,
      presignedParts: [{ partNumber: 1, url: "https://s3/p1" }],
    });
  });
});