import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import { buildSendCallsPayload } from "@/lib/wallet/smart-wallet-client";

const DIAMOND = "0xba5502db2aC2cBff189965e991C07109B14eB3f5" as Address;
const TEST_POLICY_ID = "11111111-2222-4333-8444-555555555555";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("buildSendCallsPayload", () => {
  it("hex-encodes zero value and maps paymaster policyId", () => {
    const { calls, capabilities } = buildSendCallsPayload(
      [
        {
          target: DIAMOND,
          data: "0x0d4d1513" as Hex,
          value: 0n,
        },
      ],
      {
        paymasterService: { policyId: TEST_POLICY_ID },
        erc20: { tokenAddress: USDC },
      },
    );

    expect(calls[0].value).toBe("0x0");
    expect(calls[0].to).toBe(DIAMOND);
    expect(capabilities?.paymaster).toEqual({
      policyId: TEST_POLICY_ID,
      erc20: { tokenAddress: USDC },
    });
  });

  it("supports burn on Diamond with zero value (sell path)", () => {
    const { calls } = buildSendCallsPayload([
      {
        target: DIAMOND,
        data: "0xburncalldata" as Hex,
        value: BigInt(0),
      },
    ]);

    expect(calls[0].value).toBe("0x0");
    expect(calls[0].to).toBe(DIAMOND);
  });

  it("defaults missing call data to 0x", () => {
    const { calls } = buildSendCallsPayload([
      { target: DIAMOND, value: 0n },
    ]);
    expect(calls[0].data).toBe("0x");
    expect(calls[0].value).toBe("0x0");
  });
});
