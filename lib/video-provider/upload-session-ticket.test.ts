import { beforeEach, describe, expect, it } from "vitest";
import {
  mintUploadSessionTicket,
  verifyUploadSessionTicket,
} from "./upload-session-ticket";
import { WalletAuthError } from "@/lib/auth/require-wallet";

const CREATOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const UPLOAD_ID = "vod-session-1";

describe("upload-session-ticket", () => {
  beforeEach(() => {
    process.env.FRAMEWORKS_WEBHOOK_SECRET = "unit-test-webhook-secret";
    delete process.env.LIVEPEER_WEBHOOK_SECRET;
  });

  it("mints and verifies ticket for uploadId and creator", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    expect(verifyUploadSessionTicket(ticket, UPLOAD_ID, "frameworks")).toBe(CREATOR);
  });

  it("rejects ticket when uploadId does not match", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    expect(() =>
      verifyUploadSessionTicket(ticket, "other-upload", "frameworks"),
    ).toThrow(WalletAuthError);
  });

  it("uses LIVEPEER_WEBHOOK_SECRET when provider is livepeer", () => {
    process.env.LIVEPEER_WEBHOOK_SECRET = "livepeer-secret";
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "livepeer");
    expect(verifyUploadSessionTicket(ticket, UPLOAD_ID, "livepeer")).toBe(CREATOR);
  });
});