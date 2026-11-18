import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mintUploadSessionTicket,
  verifyUploadSessionTicket,
} from "./upload-session-ticket";
import { WalletAuthError } from "@/lib/auth/require-wallet";

const CREATOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const UPLOAD_ID = "vod-session-1";
const SECRET = "unit-test-webhook-secret";

function tamperBodyResign(ticket: string, mutate: (payload: Record<string, unknown>) => void): string {
  const dot = ticket.lastIndexOf(".");
  const body = ticket.slice(0, dot);
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  mutate(payload);
  const newBody = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(newBody).digest("base64url");
  return `${newBody}.${sig}`;
}

/** Mutate payload but keep the original HMAC (signature mismatch). */
function tamperBodyKeepSig(ticket: string, mutate: (payload: Record<string, unknown>) => void): string {
  const dot = ticket.lastIndexOf(".");
  const body = ticket.slice(0, dot);
  const sig = ticket.slice(dot + 1);
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  mutate(payload);
  const newBody = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${newBody}.${sig}`;
}

describe("upload-session-ticket", () => {
  beforeEach(() => {
    process.env.FRAMEWORKS_WEBHOOK_SECRET = SECRET;
    delete process.env.LIVEPEER_WEBHOOK_SECRET;
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mints and verifies ticket for uploadId and creator", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    expect(verifyUploadSessionTicket(ticket, UPLOAD_ID, "frameworks")).toBe(CREATOR);
  });

  it("rejects expired ticket", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    vi.setSystemTime(new Date("2020-01-01T03:00:01Z"));
    expect(() => verifyUploadSessionTicket(ticket, UPLOAD_ID, "frameworks")).toThrow(
      expect.objectContaining({ status: 401, message: expect.stringMatching(/expired/i) }),
    );
  });

  it("rejects tampered creator in ticket payload (signature mismatch)", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    const bad = tamperBodyKeepSig(ticket, (p) => {
      p.creator = OTHER;
    });
    expect(() => verifyUploadSessionTicket(bad, UPLOAD_ID, "frameworks")).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("rejects tampered uploadId in ticket payload (resigned but wrong id argument)", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    const bad = tamperBodyResign(ticket, (p) => {
      p.uploadId = "other-id";
    });
    expect(() => verifyUploadSessionTicket(bad, UPLOAD_ID, "frameworks")).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("rejects tampered exp in ticket payload (resigned with past exp)", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    const bad = tamperBodyResign(ticket, (p) => {
      p.exp = 1;
    });
    expect(() => verifyUploadSessionTicket(bad, UPLOAD_ID, "frameworks")).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("rejects ticket when uploadId argument does not match", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    expect(() => verifyUploadSessionTicket(ticket, "other-upload", "frameworks")).toThrow(
      WalletAuthError,
    );
  });

  it("fails closed with 503 when webhook secret is unset (mint)", () => {
    delete process.env.FRAMEWORKS_WEBHOOK_SECRET;
    expect(() => mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks")).toThrow(
      expect.objectContaining({ status: 503 }),
    );
  });

  it("fails closed with 503 when webhook secret is unset (verify)", () => {
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "frameworks");
    delete process.env.FRAMEWORKS_WEBHOOK_SECRET;
    expect(() => verifyUploadSessionTicket(ticket, UPLOAD_ID, "frameworks")).toThrow(
      expect.objectContaining({ status: 503 }),
    );
  });

  it("uses LIVEPEER_WEBHOOK_SECRET when provider is livepeer", () => {
    process.env.LIVEPEER_WEBHOOK_SECRET = "livepeer-secret";
    const ticket = mintUploadSessionTicket(UPLOAD_ID, CREATOR, "livepeer");
    expect(verifyUploadSessionTicket(ticket, UPLOAD_ID, "livepeer")).toBe(CREATOR);
  });
});