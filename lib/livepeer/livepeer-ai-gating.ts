export const LIVEPEER_AI_DISABLED_STATUS = 'disabled' as const;

export type LivepeerAiDisabledResult = {
  status: typeof LIVEPEER_AI_DISABLED_STATUS;
  feature: 'captions' | 'text-to-image';
};

export type LivepeerAiClientFeatureFlags = {
  captionsEnabled: boolean;
  textToImageEnabled: boolean;
};

const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

/** Env unset / empty defaults to enabled (preserves current production behavior). */
export function readLivepeerAiEnvFlag(
  value: string | undefined,
  defaultWhenUnset = true,
): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultWhenUnset;
  }
  const normalized = value.trim().toLowerCase();
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  return defaultWhenUnset;
}

export function isLivepeerAiCaptionsEnabled(): boolean {
  return readLivepeerAiEnvFlag(process.env.LIVEPEER_AI_CAPTIONS_ENABLED);
}

export function isLivepeerAiTextToImageEnabled(): boolean {
  return readLivepeerAiEnvFlag(process.env.LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED);
}

export function getLivepeerAiClientFeatureFlags(): LivepeerAiClientFeatureFlags {
  return {
    captionsEnabled: isLivepeerAiCaptionsEnabled(),
    textToImageEnabled: isLivepeerAiTextToImageEnabled(),
  };
}

export function livepeerAiCaptionsDisabledResult(): LivepeerAiDisabledResult {
  return { status: LIVEPEER_AI_DISABLED_STATUS, feature: 'captions' };
}

export function livepeerAiTextToImageDisabledResult(): LivepeerAiDisabledResult {
  return { status: LIVEPEER_AI_DISABLED_STATUS, feature: 'text-to-image' };
}
