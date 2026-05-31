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
  if (assetOverride) return assetOverride;

  const chainSlug =
    readEnv('NEXT_PUBLIC_HALLIDAY_CHAIN_SLUG', 'HALLIDAY_CHAIN_SLUG') ??
    DEFAULT_CHAIN_SLUG[network];

  const token = (tokenAddress ?? LENS_GHO_TOKEN_ADDRESS).toLowerCase();
  return `${chainSlug}:${token}`;
}

export function isHallidaySandboxEnabled(): boolean {
  const value = readEnv('NEXT_PUBLIC_HALLIDAY_SANDBOX', 'HALLIDAY_SANDBOX');
  return value === '1' || value?.toLowerCase() === 'true';
}

/** Default fiat inputs for Halliday onramp (debit/credit → crypto). */
export const HALLIDAY_DEFAULT_INPUT_ASSETS = ['USD', 'EUR'] as const;

/**
 * Halliday Payments SDK input asset id (fiat symbol or `chain:tokenAddress`).
 * Multiple values let users choose pay currency in the widget (e.g. USD or EUR).
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
      .map((value) => value.trim())
      .filter(Boolean);
    if (assets.length > 0) {
      return assets;
    }
  }
  return [...HALLIDAY_DEFAULT_INPUT_ASSETS];
}

