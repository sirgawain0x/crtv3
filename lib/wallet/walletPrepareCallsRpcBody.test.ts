/**
 * Offline probe: exact JSON-RPC body @alchemy/wallet-apis prepareCalls would send
 * (same zod codec as sendCalls → wallet_prepareCalls). No network.
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { encodeFunctionData, parseAbi } from "viem";
import { buildSendCallsPayload } from "@/lib/wallet/smart-wallet-client";

const walletApisPrepareCalls = new URL(
  "../../node_modules/@alchemy/wallet-apis/dist/esm/actions/prepareCalls.js",
  import.meta.url,
).pathname;

const requireFromWalletApis = createRequire(walletApisPrepareCalls);

const { methodSchema, encode } = await import(
  "../../node_modules/@alchemy/wallet-apis/dist/esm/utils/schema.js"
);
const { toRpcCapabilities } = await import(
  "../../node_modules/@alchemy/wallet-apis/dist/esm/utils/capabilities.js"
);
const { wallet_prepareCalls } = requireFromWalletApis(
  "@alchemy/wallet-api-types/rpc",
);

const prepareCallsParamSchema = methodSchema(wallet_prepareCalls).request;

const DIAMOND = "0xba5502db2aC2cBff189965e991C07109B14eB3f5" as const;
const SCA = "0xa363219d7C0b8673df17529D469Db9eFF0f35D2A" as const;
const USDC_POLICY_ID = "11111111-2222-4333-8444-555555555555";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const mintAbi = parseAbi([
  "function mint(address meToken, uint256 collateralAmount, address recipient)",
]);

function encodePrepareCallsRpcBody(input: {
  calls: Array<{ to: string; data?: string; value?: bigint }>;
  from: string;
  chainId: number;
  clientCapabilities?: ReturnType<typeof buildSendCallsPayload>["capabilities"];
}) {
  const encoded = encode(prepareCallsParamSchema, {
    calls: input.calls,
    from: input.from,
    chainId: input.chainId,
    capabilities: toRpcCapabilities(input.clientCapabilities),
  });
  return { method: "wallet_prepareCalls" as const, params: [encoded] };
}

describe("wallet_prepareCalls RPC body (Alchemy SDK codec, offline)", () => {
  it("encodes buy mint call with bigint 0n, hex chainId, paymasterService + USDC tokenAddress", () => {
    const collateralWei = 1_000_000n;
    const mintData = encodeFunctionData({
      abi: mintAbi,
      functionName: "mint",
      args: [DIAMOND, collateralWei, SCA],
    });

    const { calls, capabilities } = buildSendCallsPayload(
      [{ target: DIAMOND, data: mintData, value: 0n }],
      {
        paymasterService: { policyId: USDC_POLICY_ID },
        erc20: { tokenAddress: USDC },
      },
    );

    const rpcBody = encodePrepareCallsRpcBody({
      calls,
      from: SCA,
      chainId: 8453,
      clientCapabilities: capabilities,
    });

    expect(rpcBody.method).toBe("wallet_prepareCalls");
    expect(rpcBody.params[0].chainId).toBe("0x2105");
    expect(rpcBody.params[0].calls[0]).toMatchObject({
      to: DIAMOND,
      value: "0x0",
    });
    expect(rpcBody.params[0].calls[0].data).toMatch(/^0x0d4d1513/);
    expect(rpcBody.params[0].capabilities).toEqual({
      paymasterService: {
        policyId: USDC_POLICY_ID,
        erc20: { tokenAddress: USDC },
      },
    });

    // Snapshot for CTO evidence (printed in test output on failure / CI artifacts)
    expect(JSON.stringify(rpcBody)).toContain('"paymasterService"');
    expect(JSON.stringify(rpcBody)).not.toContain('"paymaster":');
  });

  it("rejects pre-serialized hex call value (PR #382 serializer direction)", () => {
    const mintData = encodeFunctionData({
      abi: mintAbi,
      functionName: "mint",
      args: [DIAMOND, 1n, SCA],
    });

    expect(() =>
      encode(prepareCallsParamSchema, {
        calls: [{ to: DIAMOND, data: mintData, value: "0x0" as unknown as bigint }],
        from: SCA,
        chainId: 8453,
      }),
    ).toThrow(/Expected bigint|Invalid params/);
  });
});
