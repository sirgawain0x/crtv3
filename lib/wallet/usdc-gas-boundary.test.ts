import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  USDC_GAS_CHAIN_ID,
  buildDefaultUsdcGasContext,
  shouldApplyDefaultGas,
} from "./usdc-gas";

describe("shouldApplyDefaultGas (the compat-client gas boundary)", () => {
  it("applies when the caller expressed no gas choice on Base", () => {
    expect(shouldApplyDefaultGas(undefined, USDC_GAS_CHAIN_ID)).toBe(true);
  });

  it("respects an explicit empty object as a choice to pay ETH", () => {
    // `capabilities: {}` / `context: {}` means "I decided", so the default must
    // not override it.
    expect(shouldApplyDefaultGas({}, USDC_GAS_CHAIN_ID)).toBe(false);
  });

  it("respects an explicit paymaster/USDC context", () => {
    expect(
      shouldApplyDefaultGas(
        { paymasterService: { policyId: "be126055-1844-4b45-aa54-03c4993097c0" } },
        USDC_GAS_CHAIN_ID,
      ),
    ).toBe(false);
  });

  it("never applies on a non-Base chain", () => {
    expect(shouldApplyDefaultGas(undefined, 1)).toBe(false); // Ethereum mainnet
    expect(shouldApplyDefaultGas(undefined, 84532)).toBe(false); // Base Sepolia: no paymaster policy
  });
});

describe("buildDefaultUsdcGasContext + boundary", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_USDC_GAS_DEFAULT_FOR_ALL = "true";
    process.env.NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED = "true";
    process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID = "1a0d6599-35dc-421c-9714-e9c75355bdc3";
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("produces a context the boundary will attach on Base", () => {
    expect(shouldApplyDefaultGas(undefined, USDC_GAS_CHAIN_ID)).toBe(true);
    const context = buildDefaultUsdcGasContext();
    expect(context?.paymasterService.policyId).toBe(
      "1a0d6599-35dc-421c-9714-e9c75355bdc3",
    );
    expect(context?.erc20.maxTokenAmount).toBeGreaterThan(0n);
  });

  it("stays inert while the rollout flag is off, so the boundary is a no-op", () => {
    delete process.env.NEXT_PUBLIC_USDC_GAS_DEFAULT_FOR_ALL;
    expect(buildDefaultUsdcGasContext()).toBeUndefined();
  });
});
