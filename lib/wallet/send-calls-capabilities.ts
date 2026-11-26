/**
 * Turns a legacy gas context (the shape the hooks build) into the
 * `capabilities` object the Wallet API receives on `sendCalls`.
 *
 * Lives in its own module so it can be unit-tested without loading the Wallet
 * API SDK, and because it is the last point before the paymaster: whatever is
 * missing here is missing on the wire.
 */

import type { Hex } from "viem";
import { limitGasCapabilities } from "./gas-policy";

export type LegacyGasContextInput = {
  paymasterService?: { policyId: string };
  erc20?: {
    tokenAddress: string;
    /** Kept as a bigint: the SDK's zod codec encodes it to hex. */
    maxTokenAmount?: bigint;
    postOpSettings?: { autoApprove?: boolean };
  };
  permissions?: { context?: Hex };
};

export function mapSendCallsCapabilities(
  context?: LegacyGasContextInput,
  permissionsContext?: Hex,
): Record<string, unknown> | undefined {
  const policyId = context?.paymasterService?.policyId;
  // Forward the whole erc20 block: dropping maxTokenAmount/postOpSettings makes
  // the ERC-20 paymaster reject the operation or fall back to its own defaults.
  const erc20 = context?.erc20;

  const capabilities: Record<string, unknown> = {};

  if (policyId) {
    capabilities.paymaster = {
      policyId,
      ...(erc20 ? { erc20 } : {}),
    };
  }

  if (permissionsContext) {
    capabilities.permissions = { context: permissionsContext };
  }

  // Last stop before the paymaster: strip sponsorship or USDC gas that the
  // current policy does not allow.
  return limitGasCapabilities(capabilities);
}
