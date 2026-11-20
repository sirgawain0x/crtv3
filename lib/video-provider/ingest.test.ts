import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const graphql = vi.hoisted(() => vi.fn());
vi.mock("./frameworks-graphql", () => ({ frameworksGraphqlRequest: graphql }));
import { resolveStreamIngest } from "./ingest";
describe("provider ingest destinations", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("VIDEO_PROVIDER", "frameworks"); });
  afterEach(() => vi.unstubAllEnvs());
  it.each(["WHIP", "RTMP"] as const)("resolves the requested %s protocol from FrameWorks", async protocol => {
    graphql.mockResolvedValue({ resolveIngestEndpoint: { primary: {
      whipUrl: "https://edge.frameworks.network/whip/test-key", rtmpUrl: "rtmp://edge.frameworks.network/live/test-key",
    } } });
    const result = await resolveStreamIngest("test-key", protocol);
    expect(result.provider).toBe("frameworks");
    expect(graphql).toHaveBeenCalledWith(expect.stringContaining("resolveIngestEndpoint"), { streamKey: "test-key", protocol });
    expect(protocol === "WHIP" ? result.whipUrl : result.rtmpUrl).toContain("edge.frameworks.network");
  });
  it.each([null, { primary: { rtmpUrl: "rtmp://edge.frameworks.network/live/test" } },
    { primary: { whipUrl: "http://edge.frameworks.network/whip/test" } },
    { primary: { whipUrl: "https://user:pass@edge.frameworks.network/whip/test" } }])("fails closed when WHIP cannot be confirmed", async value => {
    graphql.mockResolvedValue({ resolveIngestEndpoint: value });
    await expect(resolveStreamIngest("test-key", "WHIP")).rejects.toThrow();
  });
  it("does not fall back to Livepeer when resolution fails", async () => {
    graphql.mockRejectedValue(new Error("unavailable"));
    await expect(resolveStreamIngest("test-key", "WHIP")).rejects.toThrow("unavailable");
  });
  it.each(["WHIP", "RTMP"] as const)("preserves Livepeer %s when selected", async protocol => {
    vi.stubEnv("VIDEO_PROVIDER", "livepeer");
    const result = await resolveStreamIngest("test/key", protocol);
    expect(JSON.stringify(result)).toContain("livepeer.studio");
    expect(JSON.stringify(result)).toContain("test%2Fkey");
    expect(graphql).not.toHaveBeenCalled();
  });
});
