// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeFunctionData } from "viem";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    encodeFunctionData: vi.fn(actual.encodeFunctionData),
  };
});

import { CancelMembershipButton } from "./CancelMembershipButton";
import { passAccessUntilMessage } from "@/lib/access/format-pass-expiration";

const EXPIRATION = 1_900_000_000;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(encodeFunctionData).mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderButton(props: Partial<React.ComponentProps<typeof CancelMembershipButton>> = {}) {
  await act(async () => {
    root.render(
      <CancelMembershipButton expiration={EXPIRATION} onConfirm={props.onConfirm} {...props} />,
    );
  });
}

function queryInDocument(selector: string) {
  return document.querySelector(selector);
}

describe("CancelMembershipButton", () => {
  it("never calls cancelAndRefund or sends a user operation", async () => {
    const onConfirm = vi.fn();
    await renderButton({ onConfirm });
    const trigger = container.querySelector('[data-testid="pass-cancel-trigger"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      (trigger as HTMLButtonElement).click();
    });
    const confirm = queryInDocument('[data-testid="pass-cancel-confirm"]');
    expect(confirm).not.toBeNull();
    await act(async () => {
      (confirm as HTMLButtonElement).click();
    });
    expect(encodeFunctionData).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows expiry copy in the confirm dialog and when acknowledged is controlled", async () => {
    const message = passAccessUntilMessage(EXPIRATION);
    await renderButton();
    await act(async () => {
      (container.querySelector('[data-testid="pass-cancel-trigger"]') as HTMLButtonElement).click();
    });
    expect(document.body.textContent).toContain(message);

    await act(async () => {
      root.render(<CancelMembershipButton expiration={EXPIRATION} acknowledged />);
    });
    expect(container.querySelector('[data-testid="pass-cancel-acknowledged"]')?.textContent).toBe(
      message,
    );
  });

  it("does not mention subscription or prorated refund language", async () => {
    await renderButton();
    await act(async () => {
      (container.querySelector('[data-testid="pass-cancel-trigger"]') as HTMLButtonElement).click();
    });
    const text = document.body.textContent?.toLowerCase() ?? "";
    expect(text).not.toContain("subscription");
    expect(text).not.toContain("prorated");
    expect(text).not.toContain("renews automatically");
  });
});
