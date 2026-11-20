import { describe, expect, it } from "vitest";
import { toFrameworksStreamNodeId } from "./stream-id";

describe("toFrameworksStreamNodeId", () => {
  const uuid = "12345678-abcd-4abc-8def-123456789abc";
  const nodeId = Buffer.from(`Stream:${uuid}`).toString("base64");

  it("maps the public webhook UUID to the stored GraphQL stream ID", () => {
    expect(toFrameworksStreamNodeId(uuid)).toBe(nodeId);
    expect(toFrameworksStreamNodeId(` ${uuid.toUpperCase()} `)).toBe(nodeId);
  });

  it.each([nodeId, "legacy-stream", "", "12345678-abcd-4abc-8def-123456789abz"])(
    "preserves an existing encoded or opaque ID (%s)", (id) => {
      expect(toFrameworksStreamNodeId(id)).toBe(id);
    },
  );

  it("does not reinterpret another GraphQL node type or noncanonical encoding", () => {
    const clip = Buffer.from(`Clip:${uuid}`).toString("base64");
    expect(toFrameworksStreamNodeId(clip)).toBe(clip);
    expect(toFrameworksStreamNodeId(`${nodeId}!`)).toBe(`${nodeId}!`);
    expect(toFrameworksStreamNodeId(`Stream:${uuid}`)).toBe(`Stream:${uuid}`);
  });
});
