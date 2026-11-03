import {
  CREATOR_SOCIAL_URL_FIELDS,
  normalizeCreatorSocialProfileUrl,
  type CreatorSocialPlatform,
} from "@/lib/creator/social-profile-urls";

const PLATFORMS: CreatorSocialPlatform[] = ["orb", "instagram", "x"];

export type SocialPayloadValidationResult =
  | { ok: true; payload: Record<string, string | null> }
  | { ok: false; errors: Record<string, string> };

export function validateAndNormalizeSocialPayload(body: {
  social_orb_url?: unknown;
  social_instagram_url?: unknown;
  social_x_url?: unknown;
}): SocialPayloadValidationResult {
  const payload: Record<string, string | null> = {};
  const errors: Record<string, string> = {};

  for (const platform of PLATFORMS) {
    const field = CREATOR_SOCIAL_URL_FIELDS[platform];
    if (!(field in body)) {
      continue;
    }
    const raw = body[field as keyof typeof body];
    if (raw === undefined) {
      continue;
    }
    if (raw !== null && typeof raw !== "string") {
      errors[field] = "Must be a text value";
      continue;
    }
    const result = normalizeCreatorSocialProfileUrl(platform, raw ?? "");
    if (!result.ok) {
      errors[field] = result.error;
      continue;
    }
    payload[field] = result.url;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, payload };
}
