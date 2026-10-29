import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildDearCreativePostUrl,
  DEFAULT_DEAR_CREATIVE_ORIGIN,
  getDearCreativeOrigin,
} from "./origin";

describe("dear-creative origin", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("defaults to the public Dear Creative origin", () => {
    delete process.env.DEAR_CREATIVE_ORIGIN;
    expect(getDearCreativeOrigin()).toBe(DEFAULT_DEAR_CREATIVE_ORIGIN);
  });

  it("builds post links under /posts/{slug}", () => {
    expect(buildDearCreativePostUrl("https://news.creativeplatform.xyz", "my-post")).toBe(
      "https://news.creativeplatform.xyz/posts/my-post",
    );
  });
});
