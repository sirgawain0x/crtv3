import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLivepeerAiClientFeatureFlags,
  isLivepeerAiCaptionsEnabled,
  isLivepeerAiTextToImageEnabled,
  readLivepeerAiEnvFlag,
  resetLivepeerAiEnvFlagWarningsForTests,
} from './livepeer-ai-gating';

vi.mock('@/lib/utils/logger', () => ({
  serverLogger: {
    warn: vi.fn(),
  },
}));

import { serverLogger } from '@/lib/utils/logger';

describe('livepeer AI env flags', () => {
  beforeEach(() => {
    resetLivepeerAiEnvFlagWarningsForTests();
    vi.mocked(serverLogger.warn).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults both features to enabled when unset', () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', '');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', '');
    expect(isLivepeerAiCaptionsEnabled()).toBe(true);
    expect(isLivepeerAiTextToImageEnabled()).toBe(true);
    expect(getLivepeerAiClientFeatureFlags()).toEqual({
      captionsEnabled: true,
      textToImageEnabled: true,
    });
  });

  it('parses explicit false and true values', () => {
    expect(readLivepeerAiEnvFlag('false', 'TEST_FLAG')).toBe(false);
    expect(readLivepeerAiEnvFlag('off', 'TEST_FLAG')).toBe(false);
    expect(readLivepeerAiEnvFlag('true', 'TEST_FLAG')).toBe(true);
    expect(readLivepeerAiEnvFlag('1', 'TEST_FLAG')).toBe(true);
  });

  it('treats unrecognized values as disabled (fail closed) and warns once', () => {
    expect(readLivepeerAiEnvFlag('flase', 'TEST_FLAG')).toBe(false);
    expect(readLivepeerAiEnvFlag('flase', 'TEST_FLAG')).toBe(false);
    expect(serverLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('allows independent toggles', () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'false');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'true');
    expect(getLivepeerAiClientFeatureFlags()).toEqual({
      captionsEnabled: false,
      textToImageEnabled: true,
    });

    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'true');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'false');
    expect(getLivepeerAiClientFeatureFlags()).toEqual({
      captionsEnabled: true,
      textToImageEnabled: false,
    });
  });
});
