import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), linked: vi.fn(), provider: vi.fn(),
  lookup: vi.fn(), save: vi.fn(), update: vi.fn(), eq: vi.fn(), bot: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/middleware/botIdGuard", () => ({ requireHumanOrVerifiedBot: mocks.bot }));
vi.mock("@/lib/middleware/rateLimit", () => ({ rateLimiters: { standard: mocks.limit } }));
vi.mock("@/lib/livepeer/studio-api", () => ({ enableStreamRecording: mocks.provider }));
vi.mock("@/lib/auth/require-wallet", () => ({ requireWalletAuth: mocks.auth,
  WalletAuthError: class WalletAuthError extends Error { constructor(public status: number, message: string) { super(message); } } }));
vi.mock("@/lib/utils/linked-identity", () => ({ isPermittedSigner: mocks.linked }));
vi.mock("@/lib/utils/logger", () => ({ serverLogger: { error: vi.fn() } }));
vi.mock("@/lib/sdk/supabase/service", () => ({ createServiceClient: async () => ({
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }),
    update: (...args: unknown[]) => { mocks.update(...args); const chain = {
      eq: (...values: unknown[]) => { mocks.eq(...values); return chain; },
      select: () => ({ maybeSingle: mocks.save }),
    }; return chain; },
  }),
}) }));
import { POST } from "./route";
import { WalletAuthError } from "@/lib/auth/require-wallet";
const owner = "0x1111111111111111111111111111111111111111";
const params = { params: Promise.resolve({ streamId: "stream-1" }) };
function request(body: unknown = { record: false }) {
  return new NextRequest("https://example.test/api/livepeer/stream/stream-1/recording", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}
describe("owner recording controls", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.bot.mockResolvedValue({ allowed: true }); mocks.limit.mockResolvedValue(null);
    mocks.auth.mockResolvedValue({ address: owner }); mocks.linked.mockResolvedValue(false);
    mocks.lookup.mockResolvedValue({ data: { id: "row-1", creator_id: owner, stream_id: "stream-1", updated_at: "baseline" }, error: null });
    mocks.provider.mockResolvedValue(undefined); mocks.save.mockResolvedValue({ data: { id: "row-1" }, error: null });
  });
  it.each([401, 403])("blocks rejected wallet authentication (%s)", async status => {
    mocks.auth.mockRejectedValue(new WalletAuthError(status, "Denied"));
    expect((await POST(request(), params)).status).toBe(status);
    expect(mocks.lookup).not.toHaveBeenCalled(); expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("blocks a signed caller who does not own or control the stream", async () => {
    mocks.auth.mockResolvedValue({ address: "0x2222222222222222222222222222222222222222" });
    expect((await POST(request(), params)).status).toBe(403);
    expect(mocks.provider).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("allows a permitted linked signer", async () => {
    mocks.auth.mockResolvedValue({ address: "0x2222222222222222222222222222222222222222" });
    mocks.linked.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect((await POST(request(), params)).status).toBe(200);
  });
  it.each([{}, { record: "false" }, null])("rejects missing or non-boolean recording choices: %j", async body => {
    expect((await POST(request(body), params)).status).toBe(400);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("does not change a missing stream", async () => {
    mocks.lookup.mockResolvedValue({ data: null, error: null });
    expect((await POST(request(), params)).status).toBe(404);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("leaves the saved preference untouched when the provider rejects it", async () => {
    mocks.provider.mockRejectedValue(new Error("upstream private details"));
    const response = await POST(request(), params);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("private details");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([false, true])("saves record=%s only after the provider accepts it", async record => {
    const response = await POST(request({ record }), params);
    expect(response.status).toBe(200);
    expect(mocks.provider).toHaveBeenCalledWith("stream-1", record);
    expect(mocks.provider.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ save_recording: record }));
    expect(mocks.eq).toHaveBeenCalledWith("id", "row-1");
    expect(mocks.eq).toHaveBeenCalledWith("updated_at", "baseline");
  });
  it.each([{ data: null, error: { message: "unavailable" } }, { data: null, error: null }])("reports an unconfirmed save or concurrent change", async result => {
    mocks.save.mockResolvedValue(result);
    expect((await POST(request(), params)).status).toBe(502);
  });
});
