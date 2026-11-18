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

  it("marks success only after completeFrameworksVodUpload succeeds", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-1", playbackId: "pb-1" },
      uploadId: "session-1",
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });
    mocks.completeFrameworksVodUpload.mockResolvedValue({ data: { asset: { id: "vod-1" } } });

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.completeFrameworksVodUpload).toHaveBeenCalledWith("session-1", [
        { partNumber: 1, etag: "etag-1" },
      ]);
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

  it("does not finish upload when completeFrameworksVodUpload fails", async () => {
    mocks.getLivepeerUploadUrl.mockResolvedValue({
      asset: { id: "artifact-3" },
      uploadId: "session-3",
      partSize: 5_242_880,
      presignedParts: [{ partNumber: 1, url: "https://parts.example/1" }],
    });
    mocks.completeFrameworksVodUpload.mockRejectedValue(new Error("ValidationError"));

    await renderUpload();
    await selectFile();
    await clickUpload();

    await vi.waitFor(() => {
      expect(mocks.completeFrameworksVodUpload).toHaveBeenCalled();
    });
    expect(onFileUploaded).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Upload Complete!");
    expect(container.textContent).toMatch(/Failed to upload/i);
  });
});