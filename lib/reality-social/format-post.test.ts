import { describe, expect, it } from "vitest";
import { formatDualPosts } from "./format-post";

describe("formatDualPosts", () => {
  it("includes Creative TV URL on both networks", () => {
    const { twitter, mastodon } = formatDualPosts({
      title: "Will Songchain hit 1M streams?",
      bountyText: "(pays 0.01 ETH)",
      bondText: "",
      answerText: "",
      url: "https://creativetv.xyz/predict/0xabc",
    });

    expect(twitter).toContain("https://creativetv.xyz/predict/0xabc");
    expect(mastodon).toContain("https://creativetv.xyz/predict/0xabc");
    expect(mastodon).toContain("#OpenData");
  });

  it("truncates long titles for Twitter", () => {
    const longTitle = "A".repeat(200);
    const { twitter } = formatDualPosts({
      title: longTitle,
      bountyText: "",
      bondText: "",
      answerText: "Yes",
      url: "https://example.com/predict/1",
    });

    expect(twitter.length).toBeLessThan(280);
    expect(twitter).toContain("https://example.com/predict/1");
  });
});
