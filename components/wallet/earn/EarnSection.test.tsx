// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { usePrivy } from "@privy-io/react-auth";
import { EarnSection } from "./EarnSection";

const positionPayload = {
  position: {
    assetsInVault: "0",
    assetsInVaultFormatted: "0",
    totalDeposited: "0",
    totalWithdrawn: "0",
    earnedYield: "0",
    earnedYieldFormatted: "0",
    sharesInVault: "0",
    assetSymbol: "USDC",
    assetDecimals: 6,
  },
  embeddedWallet: {
    walletId: "wallet-1",
    address: "0x1111111111111111111111111111111111111111",
    usdcBalance: "1000000",
  },
};

const vaultPayload = {
  vault: {
    id: "vault-1",
    name: "Test Vault",
    provider: "morpho",
    userApyPercent: "5.0",
    tvlUsd: 1_000_000,
    availableLiquidityUsd: 500_000,
    totalRewardsAprPercent: "0",
    adminWalletId: null,
    adminWalletAddress: null,
    assetSymbol: "USDC",
    assetDecimals: 6,
  },
};

function mockFetchResponses(vaultStatus: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/earn/vault")) {
        if (vaultStatus === 503) {
          return new Response(JSON.stringify({ error: "Earn is not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(vaultPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/earn/position")) {
        return new Response(JSON.stringify(positionPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

async function renderEarnSection() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(<EarnSection isVisible />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("EarnSection vault availability", () => {
  beforeEach(() => {
    vi.mocked(usePrivy).mockReturnValue({
      authenticated: true,
      getAccessToken: vi.fn().mockResolvedValue("test-token"),
    } as ReturnType<typeof usePrivy>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows unavailable state without Deposit or Withdraw when vault returns 503", async () => {
    mockFetchResponses(503);
    const { container, unmount } = await renderEarnSection();

    await act(async () => {
      await Promise.resolve();
    });

    const text = container.textContent ?? "";
    const buttonLabels = Array.from(container.querySelectorAll("button")).map(
      (el) => el.textContent?.trim() ?? "",
    );
    expect(text).toMatch(/Earn unavailable right now/i);
    expect(container.querySelector('[data-testid="earn-unavailable"]')).not.toBeNull();
    expect(buttonLabels.some((label) => label.includes("Deposit"))).toBe(false);
    expect(buttonLabels.some((label) => label.includes("Withdraw"))).toBe(false);

    unmount();
  });

  it("shows Deposit and Withdraw when vault returns 200", async () => {
    mockFetchResponses(200);
    const { container, unmount } = await renderEarnSection();

    await act(async () => {
      await Promise.resolve();
    });

    const buttonLabels = Array.from(container.querySelectorAll("button")).map(
      (el) => el.textContent?.trim() ?? "",
    );
    expect(buttonLabels.some((label) => label.includes("Deposit"))).toBe(true);
    expect(buttonLabels.some((label) => label.includes("Withdraw"))).toBe(true);
    expect(container.querySelector('[data-testid="earn-unavailable"]')).toBeNull();

    unmount();
  });
});
