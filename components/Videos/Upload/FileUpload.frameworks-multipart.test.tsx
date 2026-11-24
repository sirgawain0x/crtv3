// @vitest-environment jsdom
/* global globalThis */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FileUpload from "./FileUpload";

const CREATOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const mp4Blob = new Blob([new Uint8Array([0, 1, 2, 3])], { type: "video/mp4" });

const tusCallbacks = vi.hoisted(() => ({ onSuccess: undefined as (() => void) | undefined }));

const mocks = vi.hoisted(() => ({
  getLivepeerUploadUrl: vi.fn(),
  completeFrameworksVodUpload: vi.fn(),
  abortFrameworksVodUpload: vi.fn(),
  uploadFileViaPresignedParts: vi.fn(),
  getLivepeerAsset: vi.fn(),
  getAuthHeaders: vi.fn(),
}));

vi.mock("@/app/api/livepeer/assetUploadActions", () => ({
  getLivepeerUploadUrl: mocks.getLivepeerUploadUrl,
  completeFrameworksVodUpload: mocks.completeFrameworksVodUpload,
  abortFrameworksVodUpload: mocks.abortFrameworksVodUpload,
  getLivepeerAsset: mocks.getLivepeerAsset,
}));

vi.mock("@/lib/video-provider/frameworks/vod-multipart-upload", () => ({
  uploadFileViaPresignedParts: mocks.uploadFileViaPresignedParts,
}));

vi.mock("@/lib/hooks/accountkit/useUniversalAccount", () => ({
  useUniversalAccount: () => ({ address: CREATOR, type: "sca", loading: false }),
}));

vi.mock("@/lib/auth/useWalletAuth", () => ({
  useWalletAuth: () => ({
    isReady: true,
    getAuthHeaders: mocks.getAuthHeaders,
  }),
}));

function authHeadersAt(timestamp: number) {
  return {
    "X-Wallet-Address": CREATOR,
    "X-Wallet-Timestamp": String(timestamp),
    "X-Wallet-Signature": "0x" + "22".repeat(65),
  };
}

vi.mock("@/lib/utils/logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("./PreviewVideo", () => ({ default: () => null }));
vi.mock("@/components/ui/progress", () => ({
  Progress: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("tus-js-client", () => ({
  Upload: class {
    constructor(_file: unknown, options: { onSuccess?: () => void }) {
      tusCallbacks.onSuccess = options.onSuccess;
    }
    start() {
      tusCallbacks.onSuccess?.();
    }
  },
}));

let container: HTMLDivElement;
let root: Root;
const onFileUploaded = vi.fn();

function fileInput() {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("file input missing");
  return input as HTMLInputElement;
}

function uploadButton() {
  const btn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Upload File"),
  );
  if (!btn) throw new Error("upload button missing");
  return btn;
}

async function selectFile() {
  const file = new File([mp4Blob], "clip.mp4", { type: "video/mp4" });
  await act(async () => {
    Object.defineProperty(fileInput(), "files", { value: [file], configurable: true });
    fileInput().dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function clickUpload() {
  await act(async () => {
    uploadButton().click();
  });
}

async function renderUpload() {
  await act(async () => {
    root.render(
      <FileUpload
        onFileSelect={vi.fn()}
        onFileUploaded={onFileUploaded}
        newAssetTitle="Test clip"
      />,
    );
  });
}

describe("FileUpload FrameWorks multipart completion", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
    vi.clearAllMocks();
    mocks.getAuthHeaders.mockResolvedValue(authHeadersAt(1_700_000_000));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.uploadFileViaPresignedParts.mockResolvedValue([
      { partNumber: 1, etag: "etag-1" },
    ]);
    mocks.getLivepeerAsset.mockResolvedValue({
      status: { phase: "ready" },
      storage: { ipfs: { nftMetadata: { url: "ipfs://meta" } } },
    });
  });

  afterEach(() => {
    container.remove();
  });

  const uploadTicket = "mock-upload-ticket";

  it("marks success only after completeFrameworksVodUpload succeeds", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-1", playbackId: "pb-1" },
      uploadId: "session-1",
      uploadTicket,
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });
    mocks.completeFrameworksVodUpload.mockResolvedValue({ data: { asset: { id: "vod-1" } } });

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.getAuthHeaders).toHaveBeenCalledTimes(2);
      expect(mocks.completeFrameworksVodUpload).toHaveBeenCalledWith(
        expect.objectContaining({ address: CREATOR, timestamp: 1_700_000_000 }),
        "session-1",
        [{ partNumber: 1, etag: "etag-1" }],
        uploadTicket,
      );
    });
    await vi.waitFor(() => {
      expect(onFileUploaded).toHaveBeenCalledWith("artifact-1");
    });
    expect(container.textContent).toContain("Upload Complete!");
    expect(mocks.getLivepeerAsset).not.toHaveBeenCalled();
  });

  it("polls Livepeer IPFS metadata on tus success", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "lp-asset-1" },
      tusEndpoint: "https://tus.example/upload",
    });
    mocks.getLivepeerAsset.mockResolvedValue({
      status: { phase: "ready" },
      storage: { ipfs: { nftMetadata: { url: "ipfs://meta" } } },
    });

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.getLivepeerAsset).toHaveBeenCalledWith("lp-asset-1");
    });
  });

  it("fails when uploadId is missing and never calls complete or onFileUploaded", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-2" },
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(container.textContent).toMatch(/missing an ID/i);
    });
    expect(mocks.completeFrameworksVodUpload).not.toHaveBeenCalled();
    expect(onFileUploaded).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Upload Complete!");
  });

  it("aborts session and surfaces complete error without finishing upload", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-3" },
      uploadId: "session-3",
      uploadTicket,
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });
    mocks.completeFrameworksVodUpload.mockRejectedValue(new Error("complete rejected"));

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.completeFrameworksVodUpload).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(mocks.abortFrameworksVodUpload).toHaveBeenCalledTimes(1);
      expect(mocks.abortFrameworksVodUpload).toHaveBeenCalledWith(
        undefined,
        "session-3",
        uploadTicket,
      );
    });
    expect(onFileUploaded).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Upload Complete!");
    expect(container.textContent).toContain("complete rejected");
  });

  it("surfaces complete error when abort after complete failure also throws", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-4" },
      uploadId: "session-4",
      uploadTicket,
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });
    mocks.completeFrameworksVodUpload.mockRejectedValue(new Error("complete rejected"));
    mocks.abortFrameworksVodUpload.mockRejectedValue(new Error("abort network error"));

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.abortFrameworksVodUpload).toHaveBeenCalledWith(
        undefined,
        "session-4",
        uploadTicket,
      );
    });
    expect(container.textContent).toContain("complete rejected");
    expect(onFileUploaded).not.toHaveBeenCalled();
  });

  it("re-signs wallet proof before complete after a long multipart upload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-14T22:13:20Z"));
    const createTs = Math.floor(Date.now() / 1000);
    const completeTs = createTs + 6 * 60 + 1;
    mocks.getAuthHeaders
      .mockResolvedValueOnce(authHeadersAt(createTs))
      .mockImplementation(async () => {
        vi.advanceTimersByTime(6 * 60 * 1000 + 1000);
        return authHeadersAt(completeTs);
      });

    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-slow" },
      uploadId: "session-slow",
      uploadTicket,
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });
    mocks.completeFrameworksVodUpload.mockResolvedValue({ data: { asset: { id: "vod-slow" } } });

    let uploadStarted = false;
    mocks.uploadFileViaPresignedParts.mockImplementation(async () => {
      uploadStarted = true;
      return [{ partNumber: 1, etag: "etag-slow" }];
    });

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => expect(uploadStarted).toBe(true));

    await vi.waitFor(() => {
      expect(mocks.completeFrameworksVodUpload).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: completeTs }),
        "session-slow",
        [{ partNumber: 1, etag: "etag-slow" }],
        uploadTicket,
      );
    });
    vi.useRealTimers();
  });

  it("aborts with ticket only when re-auth before complete fails", async () => {
    mocks.getAuthHeaders
      .mockResolvedValueOnce(authHeadersAt(1_700_000_000))
      .mockRejectedValueOnce(new Error("User declined signature"));

    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-reauth" },
      uploadId: "session-reauth",
      uploadTicket,
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.abortFrameworksVodUpload).toHaveBeenCalledWith(
        undefined,
        "session-reauth",
        uploadTicket,
      );
    });
    expect(mocks.completeFrameworksVodUpload).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/declined signature/i);
    expect(onFileUploaded).not.toHaveBeenCalled();
  });
});