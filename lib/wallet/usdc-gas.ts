/**
 * USDC gas payment ("any-token" paymaster) wiring for Base.
 *
 * The policy behind `NEXT_PUBLIC_ANYTOKEN_POLICY_ID` must be an **ERC-20**
 * Gas Manager policy. Sending it without the `erc20` capability fails with
 * "Policy ... is of type ERC20, but erc20 capability is missing"; sending an
 * ETH-sponsorship policy with `erc20` fails the other way round. Keep the two
 * policy ids in separate env vars.
 */

/** Base mainnet USDC (6 decimals). */
export const USDC_ADDRESS_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

/** Base USDC has 6 decimals. */
export const USDC_DECIMALS = 6;

/**
 * Ceiling the paymaster may charge per user operation, in USDC base units.
 * Defaults to $1, which is far above current Base gas costs — it exists to stop
 * one bad operation from draining a wallet.
 */
export function getMaxGasUsdc(): bigint {
  const raw = process.env.NEXT_PUBLIC_GAS_MAX_USDC?.trim().replace(/^["']|["']$/g, "");
  const dollars = raw ? Number(raw) : 1;
  if (!Number.isFinite(dollars) || dollars <= 0) return 1_000_000n;
  return BigInt(Math.round(dollars * 10 ** USDC_DECIMALS));
}

export type Erc20PaymasterConfig = {
  tokenAddress: string;
  maxTokenAmount: bigint;
  /** Let the paymaster settle the token charge after execution. */
  postOpSettings: { autoApprove: true };
};

/**
 * The `erc20` payload that goes next to a policy id. Spread into whichever
 * capability shape the caller sends (`paymaster` for Wallet APIs).
 */
export function buildErc20PaymasterConfig(
  tokenAddress: string = USDC_ADDRESS_BASE,
): Erc20PaymasterConfig {
  return {
    tokenAddress,
    maxTokenAmount: getMaxGasUsdc(),
    postOpSettings: { autoApprove: true },
  };
}
