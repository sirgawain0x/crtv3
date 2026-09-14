import { describe, expect, it } from "vitest";
import { basisPointsToPercent } from "@/lib/sdk/privy/config";
import {
  computeEarnedYield,
  rewardsAprFromVault,
  toActionSummary,
} from "@/lib/sdk/privy/earn";
import { resolveEmbeddedEthereumWallet } from "@/lib/sdk/privy/wallet-resolver";
import type { User } from "@privy-io/node";

describe("privy earn helpers", () => {
  it("converts basis points to percent", () => {
    expect(basisPointsToPercent(361)).toBe("3.61");
    expect(basisPointsToPercent(null)).toBeNull();
  });

  it("resolves embedded ethereum wallet from linked accounts", () => {
    const user = {
      linked_accounts: [
        {
          type: "wallet",
          chain_type: "ethereum",
          wallet_client_type: "privy",
          connector_type: "embedded",
          wallet_client: "privy",
          id: "wallet-123",
          address: "0xabc",
        },
      ],
    } as unknown as User;

    expect(resolveEmbeddedEthereumWallet(user)).toEqual({
      walletId: "wallet-123",
      address: "0xabc",
    });
  });

  it("returns null when no embedded wallet exists", () => {
    const user = { linked_accounts: [] } as unknown as User;
    expect(resolveEmbeddedEthereumWallet(user)).toBeNull();
  });

  it("computes earned yield from position totals", () => {
    // 850 - (1000 - 200) = 50 USDC in 6-decimal units
    expect(computeEarnedYield(850_000000n, 1000_000000n, 200_000000n)).toBe(
      50_000000n,
    );
  });

  it("reads Morpho rewards APR and ignores other providers", () => {
    expect(
      rewardsAprFromVault({ provider: "morpho", total_rewards_apr: 50 }),
    ).toBe(50);
    expect(rewardsAprFromVault({ provider: "aave", total_rewards_apr: 50 })).toBeNull();
    expect(rewardsAprFromVault({ provider: "veda" })).toBeNull();
  });

  it("summarizes deposit and claim wallet actions", () => {
    expect(
      toActionSummary({
        id: "act-1",
        status: "succeeded",
        type: "earn_deposit",
        share_amount: "1000",
      }),
    ).toMatchObject({
      id: "act-1",
      shareAmount: "1000",
      rewards: null,
      failureReason: null,
    });

    expect(
      toActionSummary({
        id: "act-2",
        status: "rejected",
        type: "earn_incentive_claim",
        failure_reason: { message: "No rewards to claim" },
        rewards: [
          {
            token_address: "0xabc",
            token_symbol: "MORPHO",
            token_decimals: 18,
            amount: "0",
          },
        ],
      }),
    ).toMatchObject({
      failureReason: "No rewards to claim",
      shareAmount: null,
      rewards: [
        {
          tokenAddress: "0xabc",
          tokenSymbol: "MORPHO",
          tokenDecimals: 18,
          amount: "0",
        },
      ],
    });
  });
});
