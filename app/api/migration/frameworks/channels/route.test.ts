import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { auth, prepare, client } = vi.hoisted(() => ({
  auth: vi.fn(),
  prepare: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@/lib/access/require-platform-admin", () => ({
  requirePlatformAdmin: auth,
  PlatformAdminAuthError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { standard: vi.fn(async () => null) },
}));
vi.mock("@/lib/sdk/supabase/service", () => ({ createServiceClient: client }));
vi.mock(
  "@/lib/video-provider/migration/stream-replacement-server",
  async (original) => ({
    ...(await original<
      typeof import("@/lib/video-provider/migration/stream-replacement-server")
    >()),
    prepareStoredStreamReplacement: prepare,
  }),
);
import { PlatformAdminAuthError } from "@/lib/access/require-platform-admin";
import { POST } from "./route";
const source = {
  id: "11111111-1111-4111-8111-111111111111",
  creator_id: `0x${"a".repeat(40)}`,
  stream_id: "old-stream",
  playback_id: "old-play",
  is_live: false,
  save_recording: true,
  requires_metoken: false,
  metoken_price: null,
  updated_at: "2026-11-24T00:00:00Z",
};
const request = (body: unknown = source) =>
  new NextRequest("https://staging.example/api/migration/frameworks/channels", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://zxpobpucayevlrzdxhmr.supabase.co",
  );
  auth.mockResolvedValue({ address: "admin" });
  prepare.mockResolvedValue({
    state: "ready",
    streamId: "target",
    playbackId: "New_Play",
  });
});
afterEach(() => vi.unstubAllEnvs());
it.each([
  ["VERCEL_ENV", "development"],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://unexpected.supabase.co"],
  ["VERCEL_ENV", "production"],
])(
  "denies mismatched environment before authentication or mutation: %s=%s",
  async (name, value) => {
    vi.stubEnv(name, value);
    expect((await POST(request())).status).toBe(404);
    expect(auth).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  },
);
it("allows the explicit production database only with signed admin authorization", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://zdeiezfoemibjgrkyzvs.supabase.co",
  );
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(prepare).toHaveBeenCalledWith(undefined, source);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("rejects unauthorized requests before touching the database", async () => {
  auth.mockRejectedValue(
    new PlatformAdminAuthError(403, "Platform admin wallet required"),
  );
  expect((await POST(request())).status).toBe(403);
  expect(client).not.toHaveBeenCalled();
});
it("rejects live snapshots and client-supplied keys, targets or URLs", async () => {
  for (const change of [
    { is_live: true },
    { stream_key: "PRIVATE" },
    { frameworks_stream_id: "guessed" },
    { url: "https://attacker.example" },
  ])
    expect((await POST(request({ ...source, ...change }))).status).toBe(400);
  expect(prepare).not.toHaveBeenCalled();
});
it("sanitizes uncertain provider/database failures without retry", async () => {
  prepare.mockRejectedValue(new Error("PRIVATE_INGEST_KEY"));
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain("PRIVATE");
  expect(prepare).toHaveBeenCalledOnce();
});
