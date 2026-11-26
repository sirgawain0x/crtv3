/**
 * How the server swap wallet submits calls, and which paymaster capability it
 * sends with them.
 *
 * Why the capability is passed per send instead of at client construction:
 *
 * `createSmartWalletClient` accepts `paymaster` but its EVM param type is
 * `{ policyId?: string; policyIds?: string[] }` — there is no `erc20` field.
 * The implementation (`client.ts`) reduces it to a `policyIds` array and
 * `mergeClientCapabilities` re-injects only `{ policyId }` / `{ policyIds }`.
 * Anything else we pass there is discarded, so an ERC-20 (USDC gas) policy would
 * reach the RPC without `tokenAddress` / `maxTokenAmount` / `postOpSettings`.
 *
 * The RPC schema does accept them, but only on the prepare stage:
 * `PrepareCallsCapabilities.paymasterService.erc20` allows
 * `{ tokenAddress, maxTokenAmount?, postOpSettings? }` (among other branches),
 * and `maxTokenAmount` is a hex<->bigint codec — so a `bigint` is the correct
 * input and the SDK encodes it. The later `sendPreparedCalls` capability schema
 * carries only policy ids, which is expected: the ERC-20 settings are consumed
 * when the calls are prepared.
 */

import type { Address, Hex } from "viem";
import { appendBuilderCode } from "@/lib/utils/builder-code";
import type { ServerGasConfig } from "@/lib/wallet/gas-policy";

/** Capability object as the Wallet API expects it on a `sendCalls` request. */
export type SwapSendCapabilities = {
  paymaster: {
    policyId: string;
    /** Kept as a bigint: the SDK's zod codec encodes it to hex. */
    erc20?: Record<string, unknown>;
  };
};

/**
 * Build the capability for a swap send from the resolved server gas mode.
 *
 * Returns `undefined` when the platform wallet pays its own ETH — in that case
 * no capabilities key is sent at all.
 */
export function buildSwapSendCapabilities(
  gas: Pick<ServerGasConfig, "paymaster">,
): SwapSendCapabilities | undefined {
  if (!gas.paymaster) return undefined;
  return {
    paymaster: {
      policyId: gas.paymaster.policyId,
      ...(gas.paymaster.erc20 ? { erc20: gas.paymaster.erc20 } : {}),
    },
  };
}

export type SwapCallInput = {
  to: Address;
  data: Hex;
  value?: bigint;
};

/** The exact argument shape `submitSwapCalls` sends, so callers can type to it. */
export type SwapSendCallsArgs = {
  account: Address;
  calls: Array<{ to: Address; data: Hex; value: bigint }>;
  capabilities?: SwapSendCapabilities;
};

export type SwapSendClient = {
  sendCalls: (args: SwapSendCallsArgs) => Promise<{ id: string }>;
  waitForCallsStatus: (args: { id: string }) => Promise<{
    status?: string;
    receipts?: Array<{ transactionHash?: string }>;
  }>;
};

/**
 * Submit each call as its own user operation and wait for its status.
 *
 * Every `sendCalls` invocation carries the same capability — a multi-call swap
 * must not end up with the first leg paid in USDC and the second paid in ETH.
 *
 * Returns the last transaction hash. Throws if any leg reverts or if no hash
 * comes back.
 */
export async function submitSwapCalls(
  client: SwapSendClient,
  account: Address,
  calls: SwapCallInput[],
  capabilities?: SwapSendCapabilities,
): Promise<Hex> {
  let txHash: Hex | null = null;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const isLast = i === calls.length - 1;

    const { id } = await client.sendCalls({
      account,
      calls: [
        {
          to: call.to,
          data: appendBuilderCode(call.data),
          value: call.value ?? 0n,
        },
      ],
      ...(capabilities ? { capabilities } : {}),
    });

    const status = await client.waitForCallsStatus({ id });
    if (status.status === "reverted") {
      throw new Error(`Transaction reverted for call ${i + 1}`);
    }
    const receipt = status.receipts?.[0]?.transactionHash;
    if (isLast && receipt) {
      txHash = receipt as Hex;
    }
  }

  if (!txHash) {
    throw new Error("Failed to get transaction hash from swap execution");
  }
  return txHash;
}
