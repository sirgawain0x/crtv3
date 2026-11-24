import { describe, expect, it } from "vitest";
import { assertStreamProviderCompatibility, StreamProviderMigrationRequiredError } from "./stream-provider-guard";
const uuid = "11111111-1111-4111-8111-111111111111";
const node = (value: string) => Buffer.from(value).toString("base64");
describe("existing stream provider boundary", () => {
  it.each(["livepeer", "frameworks"] as const)("allows a new %s channel without a saved row", provider => {
    expect(() => assertStreamProviderCompatibility(provider, null)).not.toThrow();
  });
  it("preserves legacy Livepeer stream support", () => {
    expect(() => assertStreamProviderCompatibility("livepeer", { stream_id: uuid })).not.toThrow();
  });
  it("accepts a canonical FrameWorks Stream node", () => {
    expect(() => assertStreamProviderCompatibility("frameworks", { stream_id: node(`Stream:${uuid}`) })).not.toThrow();
  });
  it.each([uuid, "stream-legacy", "", null, node(`Clip:${uuid}`), node("Stream:bad-id"), node(`stream:${uuid}`), ` ${node(`Stream:${uuid}`)}`, node(`Stream:${uuid}`) + "="])("rejects unproven/malformed legacy IDs in FrameWorks mode: %s", stream_id => {
    expect(() => assertStreamProviderCompatibility("frameworks", { stream_id })).toThrow(StreamProviderMigrationRequiredError);
  });
  it.each([node(`Stream:${uuid}`), node(`Clip:${uuid}`), node("Stream:bad-id")])("does not let Livepeer heal a typed node ID", stream_id => {
    expect(() => assertStreamProviderCompatibility("livepeer", { stream_id })).toThrow(StreamProviderMigrationRequiredError);
  });
});
