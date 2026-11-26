/**
 * The `wallet_requestQuote_v0` payload for the server-side swap wallet.
 *
 * Kept in its own module so it can be unit-tested without pulling in the swap
 * client's wallet initialisation, and because it has one sharp edge: the quote
 * request is serialized with `JSON.stringify` and sent as JSON-RPC, but the
 * ERC-20 paymaster capability is built with a `bigint` `maxTokenAmount`.
 * `JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt`
 * on that value, so the amount must be encoded to the hex string the RPC schema
 * expects before it reaches the request.
 *
 * (This is specific to the manually constructed quote request. The Wallet API
 * SDK encodes capability values itself on its `sendCalls` path.)
 */

import type { Hex } from "viem";
import type { ServerGasConfig } from "@/lib/wallet/gas-policy";

export type SwapQuoteParams = {
  fromToken: string;
  toToken: string;
  fromAmount: Hex;
  minimumToAmount?: Hex;
};

/**
 * Encode a bigint-valued ERC-20 paymaster capability for JSON-RPC.
 *
 * `maxTokenAmount` -> `0x`-prefixed hex (base units), e.g. 1000000n (`$1` USDC)
 * -> `"0xf4240"`. Anything else is passed through untouched.
 */
export function encodeErc20ForRpc(
  erc20: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!erc20) return undefined;
  const { maxTokenAmount, ...rest } = erc20 as {
    maxTokenAmount?: bigint | string;
  };
  if (typeof maxTokenAmount === "bigint") {
    return { ...rest, maxTokenAmount: `0x${maxTokenAmount.toString(16)}` };
  }
  return { ...rest, ...(maxTokenAmount ? { maxTokenAmount } : {}) };
}

/**
 * Build the quote request. Returns plain JSON-safe data — no bigints — so the
 * caller can `JSON.stringify` it directly.
 */
export function buildSwapQuoteRequest(
  params: SwapQuoteParams,
  gas: Pick<ServerGasConfig, "paymaster">,
  accountAddress: string,
) {
  const erc20 = encodeErc20ForRpc(gas.paymaster?.erc20);

  return {
    method: "wallet_requestQuote_v0" as const,
    params: [
      {
        from: accountAddress,
        chainId: "0x2105",
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        minimumToAmount: params.minimumToAmount,
        // Only ask the quote for a paymaster when one is actually configured;
        // otherwise the platform wallet pays its own ETH.
        ...(gas.paymaster
          ? {
              capabilities: {
                paymaster: {
                  policyId: gas.paymaster.policyId,
                  ...(erc20 ? { erc20 } : {}),
                },
              },
            }
          : {}),
      },
    ],
  };
}
