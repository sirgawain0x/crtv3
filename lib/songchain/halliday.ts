import { getLensNetwork, type LensNetwork } from '@/lib/sdk/lens/chains';

/** Lens GHO (wrapped gas token) — matches Lens + Halliday onramp docs. */
export const LENS_GHO_TOKEN_ADDRESS =
  '0x000000000000000000000000000000000000800a' as const;

const DEFAULT_CHAIN_SLUG: Record<LensNetwork, string> = {
  mainnet: 'lens',
  testnet: 'lens-testnet',
};

function readEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Normalizes a Halliday Payments SDK asset id.
 * Fiat symbols → lowercase (`usd`). Tokens → `chain:0x…` with lowercase chain slug and hex.
 * @see https://docs.halliday.xyz/pages/payments-sdk-docs
 */
export function normalizeHallidayAssetId(asset: string): string {
  const trimmed = asset.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.includes(':')) {
    return trimmed.toLowerCase();
  }

  const colon = trimmed.indexOf(':');
  const chain = trimmed.slice(0, colon).trim().toLowerCase();
  const token = trimmed.slice(colon + 1).trim();
  const normalizedToken =
    token.startsWith('0x') || token.startsWith('0X')
      ? token.toLowerCase()
      : token.toLowerCase();

  return `${chain}:${normalizedToken}`;
}

/**
 * Halliday Payments SDK output asset id (`chain:tokenAddress`).
 * @see https://docs.halliday.xyz/pages/payments-sdk-docs
 */
export function buildHallidayOutputAsset(
  network: LensNetwork = getLensNetwork(),
  tokenAddress?: string | null,
): string {
  const assetOverride = readEnv(
    'NEXT_PUBLIC_HALLIDAY_OUTPUT_ASSET',
    'HALLIDAY_OUTPUT_ASSET',
  );
  if (assetOverride) return normalizeHallidayAssetId(assetOverride);

  const chainSlug =
    readEnv('NEXT_PUBLIC_HALLIDAY_CHAIN_SLUG', 'HALLIDAY_CHAIN_SLUG') ??
    DEFAULT_CHAIN_SLUG[network];

  const token = (tokenAddress ?? LENS_GHO_TOKEN_ADDRESS).toLowerCase();
  return normalizeHallidayAssetId(`${chainSlug}:${token}`);
}

export function isHallidaySandboxEnabled(): boolean {
  const value = readEnv('NEXT_PUBLIC_HALLIDAY_SANDBOX', 'HALLIDAY_SANDBOX');
  return value === '1' || value?.toLowerCase() === 'true';
}

/**
 * Default fiat input for Halliday onramp (debit/credit → crypto).
 * Single `usd` pre-selects pay currency in the widget; add `eur` via env if needed.
 */
export const HALLIDAY_DEFAULT_INPUT_ASSETS = ['usd'] as const;

/**
 * Halliday Payments SDK input asset id (fiat symbol or `chain:tokenAddress`).
 * @see https://docs.halliday.xyz/pages/payments-sdk-docs
 */
export function buildHallidayInputAssets(): string[] {
  const override = readEnv(
    'NEXT_PUBLIC_HALLIDAY_INPUT_ASSET',
    'HALLIDAY_INPUT_ASSET',
  );
  if (override) {
    const assets = override
      .split(',')
      .map((value) => normalizeHallidayAssetId(value))
      .filter(Boolean);
    if (assets.length > 0) {
      return assets;
    }
  }
  return [...HALLIDAY_DEFAULT_INPUT_ASSETS];
}
