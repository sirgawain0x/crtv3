import {
  PREDICTION_CATEGORIES,
  type PredictionCategoryValue,
} from "@/lib/predictions/categories";
import { REALITY_QUESTION_TYPES } from "@/lib/predictions/reality-question-types";
import type { QuestionType } from "@/lib/sdk/reality-eth/reality-eth-utils";
import { serverLogger } from "@/lib/utils/logger";
import { trySystemOne } from "./systemone";
import type { ChoiceAnswer, NoulAnswer, ScoreAnswer } from "./types";

export type PredictionGateInput = {
  title: string;
  description?: string;
  questionType?: QuestionType;
  outcomes?: string[];
  category?: string;
  closeDate?: string;
  closeTime?: string;
};

export type PredictionGateResult = {
  evaluated: boolean;
  suggestedType: QuestionType | null;
  suggestedCategory: PredictionCategoryValue | null;
  /** 0–3 clarity rubric. */
  clarityScore: number | null;
  resolvable: boolean;
  resolvableProbability: number | null;
  /** Hard block only when model says unresolvable with high confidence. */
  blockCreate: boolean;
  pass: boolean;
  reasons: string[];
};

const CLARITY_LEGEND = [
  "Ambiguous or unanswerable wording",
  "Somewhat clear but missing criteria",
  "Clear question with resolvable criteria",
  "Excellent, objectively resolvable market",
] as const;

const QUESTION_TYPE_VALUES = REALITY_QUESTION_TYPES.map((t) => t.value);

/**
 * Validate/structure a prediction market draft. Never used as a Reality.eth
 * oracle or to pick a winning outcome.
 */
export async function evaluatePredictionDraft(
  input: PredictionGateInput
): Promise<PredictionGateResult> {
  const title = input.title?.trim() ?? "";
  if (title.length < 3) {
    return {
      evaluated: false,
      suggestedType: null,
      suggestedCategory: null,
      clarityScore: null,
      resolvable: false,
      resolvableProbability: null,
      blockCreate: true,
      pass: false,
      reasons: ["Title is required"],
    };
  }

  const state = {
    title,
    description: input.description ?? "",
    questionType: input.questionType ?? null,
    outcomes: input.outcomes ?? [],
    category: input.category ?? null,
    closeDate: input.closeDate ?? null,
    closeTime: input.closeTime ?? null,
  };

  const typeCriteria = Object.fromEntries(
    REALITY_QUESTION_TYPES.map((t) => [
      t.value,
      `${t.label}: ${t.description}`,
    ])
  );

  const categoryCriteria = Object.fromEntries(
    PREDICTION_CATEGORIES.map((c) => [c.value, c.label])
  );

  // Type/category suggestions (Jev); resolvability checked in a second call.
  const routing = await trySystemOne(
    state,
    {
      question_type: {
        type: "choice",
        instructions:
          "Which Reality.eth question type best fits this prediction market draft?",
        criteria: typeCriteria,
      },
      category: {
        type: "choice",
        instructions: "Which category best fits this prediction market?",
        criteria: categoryCriteria,
      },
      clarity: {
        type: "score",
        instructions:
          "How clear and well-specified is this prediction market question?",
        criteria: [...CLARITY_LEGEND],
      },
    },
    { role: "routing" }
  );

  const strict = await trySystemOne(
    state,
    {
      resolvable: {
        type: "noul",
        instructions:
          "Can this question be objectively resolved by the close date using public facts, " +
          "without needing subjective taste or future undefined events? " +
          "False if ambiguous, opinion-based, or missing resolution criteria.",
        criteria: {
          true: "Objectively resolvable from public information.",
          false: "Ambiguous, subjective, or missing resolution criteria.",
        },
      },
    },
    { role: "strict" }
  );

  if (!routing && !strict) {
    return {
      evaluated: false,
      suggestedType: input.questionType ?? null,
      suggestedCategory: (input.category as PredictionCategoryValue) ?? null,
      clarityScore: null,
      resolvable: true,
      resolvableProbability: null,
      blockCreate: false,
      pass: true,
      reasons: [],
    };
  }

  const typeAns = routing?.answers.question_type as ChoiceAnswer | undefined;
  const catAns = routing?.answers.category as ChoiceAnswer | undefined;
  const clarityAns = routing?.answers.clarity as ScoreAnswer | undefined;
  const resolvableAns = strict?.answers.resolvable as NoulAnswer | undefined;

  const suggestedTypeRaw =
    typeAns?.type === "choice" ? typeAns.choice : null;
  const suggestedType =
    suggestedTypeRaw &&
    (QUESTION_TYPE_VALUES as string[]).includes(suggestedTypeRaw)
      ? (suggestedTypeRaw as QuestionType)
      : null;

  const suggestedCategoryRaw =
    catAns?.type === "choice" ? catAns.choice : null;
  const suggestedCategory =
    suggestedCategoryRaw &&
    PREDICTION_CATEGORIES.some((c) => c.value === suggestedCategoryRaw)
      ? (suggestedCategoryRaw as PredictionCategoryValue)
      : null;

  const clarityScore =
    clarityAns?.type === "score" ? clarityAns.score : null;
  const resolvableProbability =
    resolvableAns?.type === "noul" ? resolvableAns.noul : null;

  const resolvable =
    resolvableProbability === null ? true : resolvableProbability >= 0.5;

  const reasons: string[] = [];
  if (!resolvable) {
    reasons.push(
      "Question looks ambiguous or not objectively resolvable by the close date"
    );
  }
  if (clarityScore !== null && clarityScore < 1.25) {
    reasons.push("Market wording clarity is low");
  }

  // Block only when the strict model is confident the market is unresolvable.
  const blockCreate =
    resolvableProbability !== null && resolvableProbability < 0.35;

  const pass = !blockCreate && resolvable && reasons.length === 0;

  const gate: PredictionGateResult = {
    evaluated: Boolean(routing || strict),
    suggestedType,
    suggestedCategory,
    clarityScore,
    resolvable,
    resolvableProbability,
    blockCreate,
    pass,
    reasons,
  };

  serverLogger.debug("[prediction-gate] result", gate);
  return gate;
}
