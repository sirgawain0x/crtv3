import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), stream: vi.fn(), resolve: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth/require-wallet", () => ({ requireWalletAuthFor: mocks.auth,
  WalletAuthError: class WalletAuthError extends Error { constructor(public status: number, message: string) { super(message); } } }));
vi.mock("@/lib/middleware/rateLimit", () => ({ rateLimiters: { standard: mocks.limit } }));
vi.mock("@/services/streams", () => ({ getStreamByCreator: mocks.stream }));
vi.mock("@/lib/video-provider/ingest", () => ({ resolveStreamIngest: mocks.resolve }));
import { POST } from "./route";
import { WalletAuthError } from "@/lib/auth/require-wallet";
const owner = "0x1111111111111111111111111111111111111111";
function request(body: unknown = { creatorAddress: owner, protocol: "WHIP" }) {
  return new NextRequest("https://example.test/api/streams/ingest", { method: "POST", body: JSON.stringify(body) });
}
describe("owner-only ingest resolution", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.limit.mockResolvedValue(null); mocks.auth.mockResolvedValue({ address: owner });
    mocks.stream.mockResolvedValue({ stream_key: "test-key" });
    mocks.resolve.mockResolvedValue({ provider: "frameworks", whipUrl: "https://edge.frameworks.network/whip/test-key" }); });
  it("returns a non-cacheable destination only after authenticating the creator", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.auth).toHaveBeenCalledWith(expect.anything(), owner);
    expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(mocks.stream.mock.invocationCallOrder[0]);
    expect(mocks.resolve).toHaveBeenCalledWith("test-key", "WHIP");
  });
  it.each([401,403])("does not resolve or read credentials when authentication fails (%s)", async status => {
    mocks.auth.mockRejectedValue(new WalletAuthError(status, "Denied"));
    expect((await POST(request())).status).toBe(status);
    expect(mocks.stream).not.toHaveBeenCalled(); expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it.each([null, {}, { creatorAddress: owner, protocol: "SRT" }, { creatorAddress: "bad", protocol: "WHIP" }])("rejects invalid input", async body => {
    expect((await POST(request(body))).status).toBe(400); expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("does not resolve a missing stream", async () => {
    mocks.stream.mockResolvedValue(null); expect((await POST(request())).status).toBe(404);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("does not expose a key-bearing upstream error", async () => {
    mocks.resolve.mockRejectedValue(new Error("https://edge.frameworks.network/whip/private-key"));
    const response = await POST(request()); expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("private-key");
  });
});
