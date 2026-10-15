import { formatUnits } from "viem";
import { getPrivyClient } from "./client";
import {
  basisPointsToPercent,
  EARN_CLAIM_CHAIN,
  getEarnVaultId,
} from "./config";

export type EarnVaultSummary = {
  id: string;
  name: string;
  provider: string;
  userApyPercent: string | null;
  tvlUsd: number | null;
  availableLiquidityUsd: number | null;
  totalRewardsAprPercent: string | null;
  adminWalletId: string | null;
  adminWalletAddress: string | null;
  assetSymbol: string;
  assetDecimals: number;
};

export type EarnPositionSummary = {
  assetsInVault: string;
  assetsInVaultFormatted: string;
  totalDeposited: string;
  totalWithdrawn: string;
  earnedYield: string;
  earnedYieldFormatted: string;
  sharesInVault: string;
  assetSymbol: string;
  assetDecimals: number;
};

export type EarnClaimedReward = {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number | null;
  amount: string;
};

export type EarnActionSummary = {
  id: string;
  status: string;
  type: string;
  failureReason: string | null;
  shareAmount: string | null;
  rewards: EarnClaimedReward[] | null;
};

function toPositionSummary(position: {
  asset: { decimals: number; symbol: string };
  assets_in_vault: string;
  total_deposited: string;
  total_withdrawn: string;
  shares_in_vault: string;
}): EarnPositionSummary {
  const decimals = position.asset.decimals;
  const symbol = position.asset.symbol.toUpperCase();

  const assetsInVault = BigInt(position.assets_in_vault);
  const totalDeposited = BigInt(position.total_deposited);
  const totalWithdrawn = BigInt(position.total_withdrawn);
  const earnedYield = computeEarnedYield(
    assetsInVault,
    totalDeposited,
    totalWithdrawn,
  );

  return {
    assetsInVault: position.assets_in_vault,
    assetsInVaultFormatted: formatUnits(assetsInVault, decimals),
    totalDeposited: position.total_deposited,
    totalWithdrawn: position.total_withdrawn,
    earnedYield: earnedYield.toString(),
    earnedYieldFormatted: formatUnits(
      earnedYield > 0n ? earnedYield : 0n,
      decimals,
    ),
    sharesInVault: position.shares_in_vault,
    assetSymbol: symbol,
    assetDecimals: decimals,
  };
}

export function computeEarnedYield(
  assetsInVault: bigint,
  totalDeposited: bigint,
  totalWithdrawn: bigint,
): bigint {
  return assetsInVault - (totalDeposited - totalWithdrawn);
}

/** Morpho-only extra token incentives. Other providers do not expose this APR. */
export function rewardsAprFromVault(vault: {
  provider: string;
  total_rewards_apr?: number;
}): number | null {
  switch (vault.provider) {
    case "morpho":
      return vault.total_rewards_apr ?? null;
    case "aave":
    case "veda":
    case "tempo":
      return null;
    default:
      return null;
  }
}

function toVaultSummary(vault: {
  id: string;
  name: string;
  provider: string;
  user_apy: number | null;
  tvl_usd: number | null;
  available_liquidity_usd: number | null;
  total_rewards_apr?: number;
  admin_wallet_id?: string;
  admin_wallet_address?: string;
  asset: { symbol: string; decimals: number };
}): EarnVaultSummary {
  return {
    id: vault.id,
    name: vault.name,
    provider: vault.provider,
    userApyPercent: basisPointsToPercent(vault.user_apy),
    tvlUsd: vault.tvl_usd,
    availableLiquidityUsd: vault.available_liquidity_usd,
    totalRewardsAprPercent: basisPointsToPercent(rewardsAprFromVault(vault)),
    adminWalletId: vault.admin_wallet_id ?? null,
    adminWalletAddress: vault.admin_wallet_address ?? null,
    assetSymbol: vault.asset.symbol.toUpperCase(),
    assetDecimals: vault.asset.decimals,
  };
}

export function toActionSummary(action: {
  id: string;
  status: string;
  type: string;
  failure_reason?: { message: string } | null;
  share_amount?: string | null;
  rewards?: Array<{
    token_address: string;
    token_symbol: string;
    token_decimals?: number;
    amount: string;
  }> | null;
}): EarnActionSummary {
  return {
    id: action.id,
    status: action.status,
    type: action.type,
    failureReason: action.failure_reason?.message ?? null,
    shareAmount:
      action.type === "earn_deposit" ? (action.share_amount ?? null) : null,
    rewards:
      action.type === "earn_incentive_claim" && action.rewards
        ? action.rewards.map((reward) => ({
            tokenAddress: reward.token_address,
            tokenSymbol: reward.token_symbol,
            tokenDecimals: reward.token_decimals ?? null,
            amount: reward.amount,
          }))
        : null,
  };
}

export async function fetchVaultDetails(): Promise<EarnVaultSummary> {
  const privy = getPrivyClient();
  const vaultId = getEarnVaultId();
  const details =
    await privy.wallets().earn().ethereum().vaultDetails(vaultId);
  return toVaultSummary(details);
}

export async function fetchVaultPosition(
  walletId: string,
): Promise<EarnPositionSummary> {
  const privy = getPrivyClient();
  const vaultId = getEarnVaultId();
  const position = await privy
    .wallets()
    .earn()
    .ethereum()
    .vaultPosition(walletId, { vault_id: vaultId });
  return toPositionSummary(position);
}

export async function depositToVault(
  walletId: string,
  amount: string,
  userJwt: string,
) {
  const privy = getPrivyClient();
  const vaultId = getEarnVaultId();
  return privy.wallets().earn().ethereum().deposit(walletId, {
    vault_id: vaultId,
    amount,
    authorization_context: { user_jwts: [userJwt] },
  });
}

export async function withdrawFromVault(
  walletId: string,
  amount: string,
  userJwt: string,
) {
  const privy = getPrivyClient();
  const vaultId = getEarnVaultId();
  return privy.wallets().earn().ethereum().withdraw(walletId, {
    vault_id: vaultId,
    amount,
    authorization_context: { user_jwts: [userJwt] },
  });
}

export async function withdrawAllFromVault(
  walletId: string,
  rawAmount: string,
  userJwt: string,
) {
  const privy = getPrivyClient();
  const vaultId = getEarnVaultId();
  return privy.wallets().earn().ethereum().withdraw(walletId, {
    vault_id: vaultId,
    raw_amount: rawAmount,
    authorization_context: { user_jwts: [userJwt] },
  });
}

export async function claimVaultIncentives(
  walletId: string,
  userJwt: string,
) {
  const privy = getPrivyClient();
  return privy.wallets().earn().ethereum().incentive().claim(walletId, {
    chain: EARN_CLAIM_CHAIN,
    authorization_context: { user_jwts: [userJwt] },
  });
}

export async function fetchWalletAction(
  walletId: string,
  actionId: string,
) {
  const privy = getPrivyClient();
  return privy.wallets().actions.get(actionId, {
    wallet_id: walletId,
    include: "steps",
  });
}
