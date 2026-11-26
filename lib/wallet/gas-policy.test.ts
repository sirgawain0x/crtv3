import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isGasSponsorshipEnabled,
  isUsdcGasPaymentEnabled,
  limitGasCapabilities,
  resolveGasPaymentMode,
  resolveServerGas,
} from "./gas-policy";
import { buildErc20PaymasterConfig, getMaxGasUsdc } from "./usdc-gas";

const policyId = "12345678-1234-1234-1234-123456789abc";

afterEach(() => vi.unstubAllEnvs());

describe("gas payment flags", () => {
  it("pays gas in USDC unless the flag explicitly disables it", () => {
    expect(isUsdcGasPaymentEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED", "false");
    expect(isUsdcGasPaymentEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED", "true");
    expect(isUsdcGasPaymentEnabled()).toBe(true);
  });

  it("does not sponsor gas unless explicitly enabled", () => {
    expect(isGasSponsorshipEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "true");
    expect(isGasSponsorshipEnabled()).toBe(true);
  });
});

describe("limitGasCapabilities", () => {
  it("removes sponsorship by default but keeps permissions", () => {
    const capabilities = {
      paymaster: { policyId },
      paymasterService: { policyId },
      permissions: { context: "0x01" },
    };
    expect(limitGasCapabilities(capabilities)).toEqual({ permissions: { context: "0x01" } });
    expect(capabilities.paymaster).toEqual({ policyId });
  });

  it("keeps USDC (erc20) gas on by default", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "false");
    const capabilities = { paymaster: { policyId, erc20: { tokenAddress: "0x8335" } } };
    expect(limitGasCapabilities(capabilities)).toEqual(capabilities);
  });

  it("strips USDC gas when it is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED", "false");
    const capabilities = { paymaster: { policyId, erc20: { tokenAddress: "0x8335" } } };
    expect(limitGasCapabilities(capabilities)).toBeUndefined();
  });

  it("allows sponsorship only after explicit opt-in", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "true");
    expect(limitGasCapabilities({ paymaster: { policyId } })).toEqual({ paymaster: { policyId } });
  });
});

describe("resolveGasPaymentMode", () => {
  it("defaults to USDC", () => {
    const decision = resolveGasPaymentMode({ hasUsdcPolicy: true });
    expect(decision.mode).toBe("usdc");
    expect(decision.isSponsored).toBe(false);
  });

  it("downgrades a sponsorship request to USDC while sponsorship is off", () => {
    const decision = resolveGasPaymentMode({
      requested: "sponsored",
      isMember: true,
      hasSponsoredPolicy: true,
      hasUsdcPolicy: true,
    });
    expect(decision.mode).toBe("usdc");
    expect(decision.isSponsored).toBe(false);
  });

  it("refuses sponsorship for non-members even when it is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "true");
    const decision = resolveGasPaymentMode({
      requested: "sponsored",
      isMember: false,
      hasSponsoredPolicy: true,
      hasUsdcPolicy: true,
    });
    expect(decision.mode).toBe("usdc");
  });

  it("grants sponsorship to members once enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "true");
    const decision = resolveGasPaymentMode({
      requested: "sponsored",
      isMember: true,
      hasSponsoredPolicy: true,
      hasUsdcPolicy: true,
    });
    expect(decision.mode).toBe("sponsored");
    expect(decision.isSponsored).toBe(true);
  });

  it("falls back to ETH when no USDC policy is configured", () => {
    expect(resolveGasPaymentMode({ hasUsdcPolicy: false }).mode).toBe("eth");
  });

  it("honours an explicit ETH request", () => {
    expect(resolveGasPaymentMode({ requested: "eth", hasUsdcPolicy: true }).mode).toBe("eth");
  });
});

describe("USDC paymaster capability", () => {
  it("caps gas spend at $1 of USDC by default", () => {
    expect(getMaxGasUsdc()).toBe(1_000_000n);
    const config = buildErc20PaymasterConfig();
    expect(config.maxTokenAmount).toBe(1_000_000n);
    expect(config.postOpSettings).toEqual({ autoApprove: true });
  });

  it("reads the ceiling from NEXT_PUBLIC_GAS_MAX_USDC", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_MAX_USDC", "0.25");
    expect(getMaxGasUsdc()).toBe(250_000n);
  });

  it("falls back to the default when the ceiling is malformed", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_MAX_USDC", "not-a-number");
    expect(getMaxGasUsdc()).toBe(1_000_000n);
  });
});

describe("resolveServerGas (swaps, minting, transfers)", () => {
  const policy = "12345678-1234-1234-1234-123456789abc";

  it("attaches no paymaster by default, so the platform wallet pays ETH", () => {
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID", policy);
    const gas = resolveServerGas();
    expect(gas.mode).toBe("eth");
    expect(gas.paymaster).toBeUndefined();
  });

  it("sponsors only when sponsorship is explicitly enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID", policy);
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "true");
    const gas = resolveServerGas();
    expect(gas.mode).toBe("sponsored");
    expect(gas.paymaster).toEqual({ policyId: policy });
  });

  it("pays in USDC only when the platform opts in", () => {
    vi.stubEnv("NEXT_PUBLIC_ANYTOKEN_POLICY_ID", policy);
    vi.stubEnv("SERVER_GAS_MODE", "usdc");
    const gas = resolveServerGas({
      erc20Config: { tokenAddress: "0x8335", maxTokenAmount: 1_000_000n, postOpSettings: { autoApprove: true } },
    });
    expect(gas.mode).toBe("usdc");
    expect(gas.paymaster).toMatchObject({
      policyId: policy,
      erc20: { tokenAddress: "0x8335", maxTokenAmount: 1_000_000n },
    });
  });

  it("ignores SERVER_GAS_MODE=usdc while USDC gas is paused", () => {
    vi.stubEnv("NEXT_PUBLIC_ANYTOKEN_POLICY_ID", policy);
    vi.stubEnv("SERVER_GAS_MODE", "usdc");
    vi.stubEnv("NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED", "false");
    expect(resolveServerGas().mode).toBe("eth");
  });

  it("does not sponsor when the policy id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED", "true");
    expect(resolveServerGas().mode).toBe("eth");
  });
});
