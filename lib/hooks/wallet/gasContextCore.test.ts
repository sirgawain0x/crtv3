import { describe, expect, it } from "vitest";
import { resolveGasContextForMethod } from "./gasContextCore";
import { resolveTradeGasContextForMembership } from "@/lib/hooks/metokens/tradeGasContext";
import type { GetTradeGasContextFn } from "@/lib/hooks/metokens/tradeGasContext";

const SPONSORED_POLICY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const USDC_POLICY = "11111111-2222-3333-4444-555555555555";

describe("resolveGasContextForMethod with trade override", () => {
  it("returns sponsored gas when override is member even if hook isMember is stale", () => {
    const hookIsMember = false;
    const getGasContext: GetTradeGasContextFn = (method, options) =>
      resolveGasContextForMethod(method, options?.isMember ?? hookIsMember, {
        sponsoredPolicyId: SPONSORED_POLICY,
        usdcPolicyId: USDC_POLICY,
      });

    const staleDirect = resolveGasContextForMethod("sponsored", hookIsMember, {
      sponsoredPolicyId: SPONSORED_POLICY,
      usdcPolicyId: USDC_POLICY,
    });
    expect(staleDirect.context).toBeUndefined();

    const tradeResult = resolveTradeGasContextForMembership(true, getGasContext);
    expect(tradeResult.isSponsored).toBe(true);
    expect(tradeResult.context?.paymasterService?.policyId).toBe(
      SPONSORED_POLICY,
    );
  });
});
