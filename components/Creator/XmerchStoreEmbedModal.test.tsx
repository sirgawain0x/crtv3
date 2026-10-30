/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  XMERCH_IFRAME_SANDBOX,
  XmerchStoreEmbedModal,
} from "@/components/Creator/XmerchStoreEmbedModal";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div role="dialog" {...props}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

describe("XmerchStoreEmbedModal", () => {
  it("uses the expected iframe sandbox tokens", () => {
    expect(XMERCH_IFRAME_SANDBOX).toBe(
      "allow-scripts allow-same-origin allow-popups allow-forms",
    );
  });

  it("renders titled modal with sandboxed iframe and new-tab link", () => {
    const html = renderToStaticMarkup(
      <XmerchStoreEmbedModal
        open
        onOpenChange={vi.fn()}
        storeUrl="https://creative.xmerch.app"
      />,
    );

    expect(html).toContain("xMerch store");
    expect(html).toContain('src="https://creative.xmerch.app"');
    expect(html).toContain(
      'sandbox="allow-scripts allow-same-origin allow-popups allow-forms"',
    );
    expect(html).toContain('href="https://creative.xmerch.app"');
    expect(html).toContain("Open in new tab");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});
