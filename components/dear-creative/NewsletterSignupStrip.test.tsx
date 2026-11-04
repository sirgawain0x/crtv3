// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { NewsletterSignupStrip } from "./NewsletterSignupStrip";
import {
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_BODY,
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_BUTTON,
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_HEADLINE,
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_URL,
} from "@/lib/dear-creative/newsletter-signup-copy";

function renderStrip(variant: "full-width" | "compact") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(<NewsletterSignupStrip variant={variant} />);
  });
  return { container, root, cleanup: () => {
    act(() => root.unmount());
    container.remove();
  } };
}

describe("NewsletterSignupStrip", () => {
  it.each(["full-width", "compact"] as const)(
    "renders %s variant with final copy and signup link",
    (variant) => {
      const { container, cleanup } = renderStrip(variant);
      try {
        expect(
          container.querySelector(`[data-testid="newsletter-signup-strip-${variant}"]`),
        ).not.toBeNull();
        expect(container.textContent).toContain(DEAR_CREATIVE_NEWSLETTER_SIGNUP_HEADLINE);
        expect(container.textContent).toContain(DEAR_CREATIVE_NEWSLETTER_SIGNUP_BODY);
        expect(container.textContent).toContain(DEAR_CREATIVE_NEWSLETTER_SIGNUP_BUTTON);

        const link = container.querySelector(
          '[data-testid="dear-creative-newsletter-signup-link"]',
        ) as HTMLAnchorElement | null;
        expect(link).not.toBeNull();
        expect(link?.getAttribute("href")).toBe(DEAR_CREATIVE_NEWSLETTER_SIGNUP_URL);
        expect(link?.getAttribute("href")).toContain("src=ctv");
        expect(link?.getAttribute("target")).toBe("_blank");
        expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
      } finally {
        cleanup();
      }
    },
  );

  it("applies distinct layout markers per variant", () => {
    const full = renderStrip("full-width");
    const compact = renderStrip("compact");
    try {
      expect(full.container.querySelector('[data-variant="full-width"]')).not.toBeNull();
      expect(compact.container.querySelector('[data-variant="compact"]')).not.toBeNull();
      expect(full.container.innerHTML).toContain("border-y");
      expect(compact.container.innerHTML).toContain("rounded-xl");
    } finally {
      full.cleanup();
      compact.cleanup();
    }
  });
});
