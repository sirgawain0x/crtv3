import { describe, expect, it } from "vitest";
import { buildSwapQuoteRequest, encodeErc20ForRpc } from "./swap-quote";

const params = {
  fromToken: "0x0000000000000000000000000000000000000000",
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  fromAmount: "0xde0b6b3a7640000" as const,
  minimumToAmount: "0x0" as const,
};

const account = "0x04F5C5691E2F3e79246B08b98e912b3D2a786696";

describe("encodeErc20ForRpc", () => {
  it("encodes maxTokenAmount as hex, not a bigint", () => {
    const encoded = encodeErc20ForRpc({
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      maxTokenAmount: 1_000_000n,
      postOpSettings: { autoApprove: true },
    });

    expect(encoded?.maxTokenAmount).toBe("0xf4240");
    expect(typeof encoded?.maxTokenAmount).toBe("string");
    expect(encoded?.postOpSettings).toEqual({ autoApprove: true });
  });

  it("passes through an undefined config", () => {
    expect(encodeErc20ForRpc(undefined)).toBeUndefined();
  });
});

describe("buildSwapQuoteRequest", () => {
  it("serializes a USDC-mode quote request without throwing", () => {
    // Regression: gas.paymaster carried a bigint maxTokenAmount straight into
    // the request and JSON.stringify threw before the fetch was sent.
    const gas = {
      paymaster: {
        policyId: "1a0d6599-35dc-421c-9714-e9c75355bdc3",
        erc20: {
          tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          maxTokenAmount: 1_000_000n,
          postOpSettings: { autoApprove: true },
        },
      },
    };

    const request = buildSwapQuoteRequest(params, gas, account);
    const serialized = JSON.stringify({ id: 1, jsonrpc: "2.0", ...request });

    expect(serialized).toContain("0xf4240");
    const parsed = JSON.parse(serialized);
    expect(parsed.params[0].capabilities.paymaster.policyId).toBe(
      "1a0d6599-35dc-421c-9714-e9c75355bdc3",
    );
    expect(parsed.params[0].capabilities.paymaster.erc20.maxTokenAmount).toBe(
      "0xf4240",
    );
    expect(parsed.params[0].chainId).toBe("0x2105");
  });

  it("omits capabilities entirely when no paymaster is configured (ETH mode)", () => {
    const request = buildSwapQuoteRequest(params, {}, account);
    expect(request.params[0]).not.toHaveProperty("capabilities");
    expect(() => JSON.stringify(request)).not.toThrow();
  });

  it("sends only the policy id for a sponsored quote", () => {
    const request = buildSwapQuoteRequest(
      params,
      { paymaster: { policyId: "be126055-1844-4b45-aa54-03c4993097c0" } },
      account,
    );
    const paymaster = request.params[0].capabilities?.paymaster;
    expect(paymaster?.policyId).toBe("be126055-1844-4b45-aa54-03c4993097c0");
    expect(paymaster).not.toHaveProperty("erc20");
  });
});
