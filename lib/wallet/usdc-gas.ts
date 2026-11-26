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

/**
 * Whether USDC gas should be attached to operations that specify no gas context
 * at all.
 *
 * Off by default so the switch is a deliberate, staged rollout: flipping it
 * changes every send that previously fell through to ETH. Enable on staging,
 * confirm a real send charges USDC, then enable in production.
 */
export function isUsdcGasDefaultEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USDC_GAS_DEFAULT_FOR_ALL === "true";
}

/**
 * Base mainnet — the only chain where the USDC (ERC-20) paymaster policy is
 * configured. Applying the default elsewhere would send a Base policy id to a
 * network that has no such policy.
 */
export const USDC_GAS_CHAIN_ID = 8453;

/**
 * Whether the staged USDC default should be attached to a send.
 *
 * Only when the caller expressed **no** gas choice at all (`undefined`), and
 * only on Base. Any explicit value — including an empty object, which is how a
 * caller opts to pay ETH — always wins. The compat client calls this for both
 * `sendCalls` and `sendUserOperation` so direct Wallet API callers get the same
 * treatment as the React hook.
 */
export function shouldApplyDefaultGas(
  explicitGasChoice: unknown,
  chainId: number,
): boolean {
  return explicitGasChoice === undefined && chainId === USDC_GAS_CHAIN_ID;
}

/** Legacy capability shape used by the compat hook layer. */
export type LegacyGasContext = {
  paymasterService: { policyId: string };
  erc20: Erc20PaymasterConfig;
};

/**
 * Default gas context for send paths that pass none.
 *
 * Returns undefined when the rollout flag, the USDC kill switch, or the ERC-20
 * policy id is missing — in which case the caller pays ETH exactly as before.
 */
export function buildDefaultUsdcGasContext(): LegacyGasContext | undefined {
  if (!isUsdcGasDefaultEnabled()) return undefined;
  if (process.env.NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED?.trim().toLowerCase() === "false") return undefined;

  const policyId = process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID?.replace(/^["']|["']$/g, "").trim();
  if (!policyId) return undefined;

  return {
    paymasterService: { policyId },
    erc20: buildErc20PaymasterConfig(),
  };
}
