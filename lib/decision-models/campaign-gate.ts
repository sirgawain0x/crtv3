import { PREDICTION_CATEGORIES } from "@/lib/predictions/categories";
import { serverLogger } from "@/lib/utils/logger";
import { trySystemOne } from "./systemone";
import type { ChoiceAnswer, NoulAnswer, ScoreAnswer } from "./types";

/** Creator niches used for brand↔creator routing suggestions. */
export const CAMPAIGN_CREATOR_NICHES = [
  "music",
  "finance",
  "technology",
  "sports",
  "entertainment",
  "general",
] as const;

export type CampaignCreatorNiche = (typeof CAMPAIGN_CREATOR_NICHES)[number];

export type CampaignGateInput = {
  brandName: string;
  brandHandle: string;
  campaignTitle: string;
  campaignDescription: string;
  purchaseUrl: string;
  productImageUrl: string;
  startDate: Date | string;
  endDate: Date | string;
  targetCreator: string;
  budgetUsdc?: number;
};

export type CampaignGateResult = {
  /** Whether the decision model ran. */
  evaluated: boolean;
  brandSafe: boolean;
  brandSafeProbability: number | null;
  datesValid: boolean;
  datesValidProbability: number | null;
  /** 0–3 quality rubric (unclear → strong CTA). */
  qualityScore: number | null;
  niche: CampaignCreatorNiche | null;
  /** auto_eligible when policy + quality pass; otherwise needs_review. */
  review: "auto_eligible" | "needs_review" | "skipped";
  reasons: string[];
};

const QUALITY_LEGEND = [
  "Unclear offer or weak call to action",
  "Basic but incomplete campaign draft",
  "Clear product and CTA with usable details",
  "Strong, brand-safe campaign ready for creators",
] as const;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Score a shoppable campaign draft for policy, quality, and creator niche.
 * Does not write copy or replace Gemini product detection.
 * When Ollama is unset, returns evaluated:false / review:skipped.
 */
export async function evaluateCampaignDraft(
  input: CampaignGateInput
): Promise<CampaignGateResult> {
  const start = asDate(input.startDate);
  const end = asDate(input.endDate);
  const deterministicReasons: string[] = [];
  if (!(end > start)) {
    deterministicReasons.push("endDate must be after startDate");
  }

  const state = {
    brandName: input.brandName,
    brandHandle: input.brandHandle,
    campaignTitle: input.campaignTitle,
    campaignDescription: input.campaignDescription,
    purchaseUrl: input.purchaseUrl,
    productImageUrl: input.productImageUrl,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    targetCreator: input.targetCreator,
    budgetUsdc: input.budgetUsdc ?? null,
  };

  const result = await trySystemOne(
    state,
    {
      brand_safe: {
        type: "noul",
        instructions:
          "Is this campaign draft brand-safe and appropriate for a creator video platform? " +
          "False if spammy, scam-like, adult, hateful, or clearly abusive purchase URLs.",
        criteria: {
          true: "Safe for public creator commerce overlays.",
          false: "Unsafe, scammy, or policy-violating.",
        },
      },
      dates_sensible: {
        type: "noul",
        instructions:
          "Do the start/end dates form a sensible campaign window (end after start, not absurdly long or already expired relative to typical campaigns)?",
      },
      quality: {
        type: "score",
        instructions:
          "Rate the clarity of the offer and call to action in this campaign draft.",
        criteria: [...QUALITY_LEGEND],
      },
      niche: {
        type: "choice",
        instructions:
          "Which creator niche best matches this campaign for routing?",
        criteria: Object.fromEntries(
          CAMPAIGN_CREATOR_NICHES.map((n) => {
            const label =
              PREDICTION_CATEGORIES.find((c) => c.value === n)?.label ?? n;
            return [n, `${label} creators`];
          })
        ),
      },
    },
    { role: "strict" }
  );

  if (!result) {
    return {
      evaluated: false,
      brandSafe: deterministicReasons.length === 0,
      brandSafeProbability: null,
      datesValid: deterministicReasons.length === 0,
      datesValidProbability: null,
      qualityScore: null,
      niche: null,
      review: "skipped",
      reasons: deterministicReasons,
    };
  }

  const brandSafeAns = result.answers.brand_safe as NoulAnswer | undefined;
  const datesAns = result.answers.dates_sensible as NoulAnswer | undefined;
  const qualityAns = result.answers.quality as ScoreAnswer | undefined;
  const nicheAns = result.answers.niche as ChoiceAnswer | undefined;

  const brandSafeProbability =
    brandSafeAns?.type === "noul" ? brandSafeAns.noul : null;
  const datesValidProbability =
    datesAns?.type === "noul" ? datesAns.noul : null;
  const qualityScore =
    qualityAns?.type === "score" ? qualityAns.score : null;
  const nicheRaw = nicheAns?.type === "choice" ? nicheAns.choice : null;
  const niche =
    nicheRaw &&
    (CAMPAIGN_CREATOR_NICHES as readonly string[]).includes(nicheRaw)
      ? (nicheRaw as CampaignCreatorNiche)
      : null;

  const brandSafe =
    brandSafeProbability === null ? true : brandSafeProbability >= 0.55;
  const datesValid =
    deterministicReasons.length === 0 &&
    (datesValidProbability === null ? true : datesValidProbability >= 0.55);

  const reasons = [...deterministicReasons];
  if (!brandSafe) reasons.push("Failed brand-safety check");
  if (!datesValid && deterministicReasons.length === 0) {
    reasons.push("Campaign dates look invalid or impractical");
  }
  if (qualityScore !== null && qualityScore < 1.25) {
    reasons.push("Campaign offer/CTA clarity is low");
  }

  const autoEligible =
    brandSafe &&
    datesValid &&
    (qualityScore === null || qualityScore >= 1.5) &&
    reasons.length === 0;

  const gate: CampaignGateResult = {
    evaluated: true,
    brandSafe,
    brandSafeProbability,
    datesValid,
    datesValidProbability,
    qualityScore,
    niche,
    review: autoEligible ? "auto_eligible" : "needs_review",
    reasons,
  };

  serverLogger.debug("[campaign-gate] result", gate);
  return gate;
}
