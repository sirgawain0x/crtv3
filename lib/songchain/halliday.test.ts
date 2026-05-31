import { afterEach, describe, expect, it } from 'vitest';
import {
  buildHallidayInputAssets,
  buildHallidayOutputAsset,
  HALLIDAY_DEFAULT_INPUT_ASSETS,
  isHallidaySandboxEnabled,
  LENS_GHO_TOKEN_ADDRESS,
} from './halliday';

describe('buildHallidayOutputAsset', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('builds lens mainnet GHO output by default', () => {
    delete process.env.NEXT_PUBLIC_HALLIDAY_OUTPUT_ASSET;
    delete process.env.NEXT_PUBLIC_HALLIDAY_CHAIN_SLUG;
    process.env.NEXT_PUBLIC_LENS_ENV = 'production';

    expect(buildHallidayOutputAsset('mainnet')).toBe(
      `lens:${LENS_GHO_TOKEN_ADDRESS}`,
    );
  });

  it('respects full output asset override', () => {
    process.env.NEXT_PUBLIC_HALLIDAY_OUTPUT_ASSET = 'lens:0xabc';
    expect(buildHallidayOutputAsset('mainnet')).toBe('lens:0xabc');
  });
});

describe('buildHallidayInputAssets', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('defaults to USD and EUR for fiat onramp', () => {
    delete process.env.NEXT_PUBLIC_HALLIDAY_INPUT_ASSET;
    expect(buildHallidayInputAssets()).toEqual([...HALLIDAY_DEFAULT_INPUT_ASSETS]);
  });

  it('supports comma-separated input overrides', () => {
    process.env.NEXT_PUBLIC_HALLIDAY_INPUT_ASSET = 'USD, EUR';
    expect(buildHallidayInputAssets()).toEqual(['USD', 'EUR']);
  });
});

describe('isHallidaySandboxEnabled', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('returns true when sandbox flag is set', () => {
    process.env.NEXT_PUBLIC_HALLIDAY_SANDBOX = 'true';
    expect(isHallidaySandboxEnabled()).toBe(true);
  });
});
