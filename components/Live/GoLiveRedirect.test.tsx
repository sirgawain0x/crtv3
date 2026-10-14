// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

const mockReplace = vi.fn();
const mockOpenAuthModal = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn(),
}));

vi.mock("@/lib/wallet/react", () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
  useLogout: () => ({ logout: vi.fn() }),
}));

vi.mock("@/lib/hooks/accountkit/useCreatorWalletAddress", () => ({
  useCreatorWalletAddress: vi.fn(),
}));

import { usePrivy } from "@privy-io/react-auth";
import { useCreatorWalletAddress } from "@/lib/hooks/accountkit/useCreatorWalletAddress";
import { GoLiveRedirect } from "./GoLiveRedirect";

async function renderUi() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(<GoLiveRedirect />);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("GoLiveRedirect", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockOpenAuthModal.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prompts sign-in when Privy is ready but user is logged out", async () => {
    vi.mocked(usePrivy).mockReturnValue({
      ready: true,
      authenticated: false,
    } as ReturnType<typeof usePrivy>);
    vi.mocked(useCreatorWalletAddress).mockReturnValue({
      creatorAddress: null,
      isLoading: false,
      isAuthenticated: false,
      walletInitTimedOut: false,
      isConnected: false,
      smartAccountAddress: null,
      eoaAddress: null,
      signerAddress: null,
    });

    const { container, unmount } = await renderUi();
    expect(container.textContent).toMatch(/Sign in to go live/i);
    unmount();
  });

  it("redirects to live studio when creator address is available", async () => {
    vi.mocked(usePrivy).mockReturnValue({
      ready: true,
      authenticated: true,
    } as ReturnType<typeof usePrivy>);
    vi.mocked(useCreatorWalletAddress).mockReturnValue({
      creatorAddress: "0xabc0000000000000000000000000000000000001",
      isLoading: false,
      isAuthenticated: true,
      walletInitTimedOut: false,
      isConnected: true,
      smartAccountAddress: "0xabc0000000000000000000000000000000000001",
      eoaAddress: null,
      signerAddress: null,
    });

    const { unmount } = await renderUi();
    expect(mockReplace).toHaveBeenCalledWith(
      "/live/0xabc0000000000000000000000000000000000001",
    );
    unmount();
  });
});
