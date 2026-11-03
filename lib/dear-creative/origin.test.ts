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

  it("percent-encodes slug path segments", () => {
    expect(buildDearCreativePostUrl("https://news.creativeplatform.xyz", "hello world")).toBe(
      "https://news.creativeplatform.xyz/posts/hello%20world",
    );
    expect(buildDearCreativePostUrl("https://news.creativeplatform.xyz", "a/b")).toBe(
      "https://news.creativeplatform.xyz/posts/a%2Fb",
    );
  });

  it("falls back to the default origin when DEAR_CREATIVE_ORIGIN is invalid", () => {
    process.env.DEAR_CREATIVE_ORIGIN = "not a valid url!!!";
    expect(getDearCreativeOrigin()).toBe(DEFAULT_DEAR_CREATIVE_ORIGIN);
  });

  it("falls back when DEAR_CREATIVE_ORIGIN uses a non-http(s) scheme", () => {
    process.env.DEAR_CREATIVE_ORIGIN = "javascript:alert(1)";
    expect(getDearCreativeOrigin()).toBe(DEFAULT_DEAR_CREATIVE_ORIGIN);
  });

  it("normalizes a valid configured origin", () => {
    process.env.DEAR_CREATIVE_ORIGIN = "https://custom.example/path///";
    expect(getDearCreativeOrigin()).toBe("https://custom.example/path");
  });
});
