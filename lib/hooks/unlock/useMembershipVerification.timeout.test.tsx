// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { WALLET_INIT_TIMEOUT_MS } from "@/lib/wallet/wallet-init-timeout";
import { WALLET_INIT_TIMEOUT_CODE } from "@/lib/hooks/unlock/membership-wallet-wait";

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn(),
}));

vi.mock("@/lib/wallet/react", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/lib/hooks/accountkit/useModularAccount", () => ({
  default: vi.fn(),
}));

vi.mock("../../sdk/unlock/services", () => ({
  unlockService: { getAllMemberships: vi.fn() },
}));

import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { useMembershipVerification } from "./useMembershipVerification";

async function renderMembershipHook() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const resultRef: { current: ReturnType<typeof useMembershipVerification> | null } =
    { current: null };

  function HookWrapper() {
    resultRef.current = useMembershipVerification();
    return null;
  }

  await act(async () => {
    root.render(<HookWrapper />);
  });

  return {
    get result() {
      return resultRef.current!;
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("useMembershipVerification wallet timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(usePrivy).mockReturnValue({
      ready: true,
      authenticated: true,
    } as ReturnType<typeof usePrivy>);
    vi.mocked(useUser).mockReturnValue(null);
    vi.mocked(useModularAccount).mockReturnValue({
      smartAccountClient: undefined,
      address: null,
      loading: true,
    } as ReturnType<typeof useModularAccount>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("exposes retryable error after timeout while useUser stays null", async () => {
    const view = await renderMembershipHook();

    expect(view.result.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(WALLET_INIT_TIMEOUT_MS + 100);
    });

    expect(view.result.isLoading).toBe(false);
    expect(view.result.error?.code).toBe(WALLET_INIT_TIMEOUT_CODE);

    view.unmount();
  });
});
