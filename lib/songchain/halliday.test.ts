import { afterEach, describe, expect, it } from 'vitest';
import {
  buildHallidayHeaderTitle,
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

  it('falls back to defaults when override is only whitespace or commas', () => {
    process.env.NEXT_PUBLIC_HALLIDAY_INPUT_ASSET = ' , , ';
    expect(buildHallidayInputAssets()).toEqual([...HALLIDAY_DEFAULT_INPUT_ASSETS]);
  });
});

describe('buildHallidayHeaderTitle', () => {
  it('lists configured fiat currencies', () => {
    expect(buildHallidayHeaderTitle(['USD', 'EUR'])).toBe('Buy GHO with USD, EUR');
  });

  it('uses generic title when no inputs', () => {
    expect(buildHallidayHeaderTitle([])).toBe('Buy GHO');
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
