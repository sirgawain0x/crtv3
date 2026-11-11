import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLivepeerAiClientFeatureFlags,
  isLivepeerAiCaptionsEnabled,
  isLivepeerAiTextToImageEnabled,
  readLivepeerAiEnvFlag,
} from './livepeer-ai-gating';

describe('livepeer AI env flags', () => {
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
    expect(readLivepeerAiEnvFlag('false')).toBe(false);
    expect(readLivepeerAiEnvFlag('off')).toBe(false);
    expect(readLivepeerAiEnvFlag('true')).toBe(true);
    expect(readLivepeerAiEnvFlag('1')).toBe(true);
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
