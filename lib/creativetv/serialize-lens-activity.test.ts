import { describe, expect, it } from "vitest";
import type { AnyPost } from "@lens-protocol/graphql";
import { serializeLensActivityPost } from "@/lib/creativetv/serialize-lens-activity";

describe("serializeLensActivityPost", () => {
  it("maps text posts to activity items", () => {
    const post = {
      __typename: "Post",
      id: "0x01-0xabc",
      author: {
        address: "0x1234567890123456789012345678901234567890",
        username: { localName: "creator" },
      },
      metadata: { content: "Hello Creative TV" },
      timestamp: "2026-01-01T12:00:00.000Z",
    } as unknown as AnyPost;

    const item = serializeLensActivityPost(post);
    expect(item).toMatchObject({
      id: "0x01-0xabc",
      text: "Hello Creative TV",
      authorLabel: "@creator",
      authorHandle: "creator",
      orbUrl: "https://orb.club/p/creator/0x01-0xabc",
    });
  });
});
