import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mapSendCallsCapabilities } from "./send-calls-capabilities";
import { buildDefaultUsdcGasContext } from "./usdc-gas";

const POLICY = "1a0d6599-35dc-421c-9714-e9c75355bdc3";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("mapSendCallsCapabilities", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_USDC_GAS_DEFAULT_FOR_ALL = "true";
    process.env.NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED = "true";
    process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID = POLICY;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("forwards the whole erc20 block, not just the policy id", () => {
    // This is the payload that reaches the SDK's sendCalls: if erc20 is missing
    // here, an ERC-20 policy arrives at the paymaster with no token settings.
    const capabilities = mapSendCallsCapabilities(buildDefaultUsdcGasContext());

    expect(capabilities).toEqual({
      paymaster: {
        policyId: POLICY,
        erc20: {
          tokenAddress: USDC,
          maxTokenAmount: 1_000_000n,
          postOpSettings: { autoApprove: true },
        },
      },
    });
  });

  it("keeps maxTokenAmount a bigint for the SDK to encode", () => {
    const paymaster = mapSendCallsCapabilities(buildDefaultUsdcGasContext())?.paymaster as {
      erc20?: { maxTokenAmount?: unknown };
    };
    expect(typeof paymaster.erc20?.maxTokenAmount).toBe("bigint");
  });

  it("produces nothing for an explicit ETH choice", () => {
    // An empty context is a caller's decision, not a request for the default.
    expect(mapSendCallsCapabilities({})).toBeUndefined();
  });

  it("carries a permissions context through untouched", () => {
    expect(
      mapSendCallsCapabilities(
        { permissions: { context: "0xdeadbeef" } },
        "0xdeadbeef",
      ),
    ).toEqual({ permissions: { context: "0xdeadbeef" } });
  });

  it("strips USDC gas when the kill switch is off", () => {
    process.env.NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED = "false";
    expect(mapSendCallsCapabilities(buildDefaultUsdcGasContext())).toBeUndefined();
  });
});
