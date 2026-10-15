import { describe, expect, it } from "vitest";
import { isMeTokenSubscribed } from "./metokenSubscriptionUtils";
import type { MeTokenInfo } from "@/lib/hooks/metokens/useMeTokensSupabase";

describe("isMeTokenSubscribed", () => {
  const baseInfo: MeTokenInfo = {
    owner: "0x0000000000000000000000000000000000000001",
    hubId: 0n,
    balancePooled: 0n,
    balanceLocked: 0n,
    startTime: 0n,
    endTime: 0n,
    endCooldown: 0n,
    targetHubId: 0n,
    migration: "0x0000000000000000000000000000000000000000",
  };

  it("treats hub assignment with zero balances as subscribed", () => {
    expect(
      isMeTokenSubscribed({
        ...baseInfo,
        hubId: 2n,
      })
    ).toBe(true);
  });

  it("treats zero hub with zero balances as not subscribed", () => {
    expect(isMeTokenSubscribed(baseInfo)).toBe(false);
  });

  it("treats pooled collateral without hub as subscribed", () => {
    expect(
      isMeTokenSubscribed({
        ...baseInfo,
        balancePooled: 1n,
      })
    ).toBe(true);
  });
});
