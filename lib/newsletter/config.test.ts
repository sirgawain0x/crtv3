import { describe, expect, it, vi } from "vitest";
import {
  buildIssueCanonicalUrl,
  getDearCreativePublicationSlug,
  getNewsletterProvider,
} from "./config";

describe("getNewsletterProvider", () => {
  it("defaults to paragraph", () => {
    vi.stubEnv("NEWSLETTER_PROVIDER", "");
    expect(getNewsletterProvider()).toBe("paragraph");
  });

  it("supports creative", () => {
    vi.stubEnv("NEWSLETTER_PROVIDER", "creative");
    expect(getNewsletterProvider()).toBe("creative");
  });
});

describe("buildIssueCanonicalUrl", () => {
  it("uses news subdomain for paragraph dear-creative", () => {
    vi.stubEnv("NEWSLETTER_PROVIDER", "paragraph");
    vi.stubEnv("NEXT_PUBLIC_DEAR_CREATIVE_NEWSLETTER_SLUG", "dear-creative");
    expect(buildIssueCanonicalUrl("dear-creative", "hello-world")).toBe(
      "https://news.creativeplatform.xyz/hello-world"
    );
  });

  it("uses TV path for creative provider", () => {
    vi.stubEnv("NEWSLETTER_PROVIDER", "creative");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tv.creativeplatform.xyz");
    expect(buildIssueCanonicalUrl("dear-creative", "issue-1")).toBe(
      "https://tv.creativeplatform.xyz/news/dear-creative/issue-1"
    );
  });
});

describe("getDearCreativePublicationSlug", () => {
  it("falls back to dear-creative", () => {
    vi.stubEnv("NEXT_PUBLIC_DEAR_CREATIVE_NEWSLETTER_SLUG", "");
    expect(getDearCreativePublicationSlug()).toBe("dear-creative");
  });
});
