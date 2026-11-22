import { keccak256, stringToHex } from "viem";
import type { QuestionType } from "@/lib/sdk/reality-eth/reality-eth-utils";
import { getStandardQuestionType, parseQuestionLocal } from "@/lib/reality-social/parse-question-local";

export type ParsedPredictionDisplay = {
  title: string;
  type: "bool" | "uint" | "single-select" | "multiple-select";
  outcomes: string[];
  category: string;
  language: string;
  description?: string;
};

const ZERO_ANSWER =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
const ONE_ANSWER =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

function isValidQuestionType(value: string): value is ParsedPredictionDisplay["type"] {
  return (
    value === "bool" ||
    value === "uint" ||
    value === "single-select" ||
    value === "multiple-select"
  );
}

export type PredictionMetadataInput = {
  title?: string | null;
  questionType?: string | null;
  category?: string | null;
  outcomes?: string[] | null;
};

/** Prefer Supabase-stored title when on-chain parse failed. */
export function applyPredictionMetadataOverride(
  parsed: ParsedPredictionDisplay,
  metadata?: PredictionMetadataInput | null
): ParsedPredictionDisplay {
  if (!metadata) return parsed;

  let next = { ...parsed };

  if (
    metadata.title?.trim() &&
    (parsed.title.startsWith("[Badly formatted question]") ||
      parsed.title === "Untitled Prediction")
  ) {
    next = { ...next, title: metadata.title.trim() };
  }

  if (metadata.questionType && isValidQuestionType(metadata.questionType)) {
    next = { ...next, type: metadata.questionType };
    if (metadata.questionType === "uint") {
      next.outcomes = [];
    } else if (metadata.questionType === "bool" && next.outcomes.length === 0) {
      next.outcomes = ["Yes", "No"];
    }
  }

  if (metadata.category?.trim()) {
    next = { ...next, category: metadata.category.trim() };
  }

  if (metadata.outcomes?.length) {
    next = { ...next, outcomes: metadata.outcomes.filter(Boolean) };
    if (
      next.type === "bool" &&
      next.outcomes.length > 2
    ) {
      next = { ...next, type: "single-select" };
    }
  }

  return next;
}

/**
 * Parse encoded Reality.eth question text for display.
 */
export function parsePredictionDisplay(
  questionText: string,
  templateId?: string | number | bigint | null
): ParsedPredictionDisplay {
  const raw = (questionText ?? "").trim();
  // Share the lightweight parser with social sync; no jsdom/formatter import.
  const parsed = parseQuestionLocal(raw, undefined, templateId);
  if (parsed) return parsed;

  const type = getStandardQuestionType(templateId) ?? "bool";
  return {
    title: raw || "Untitled Prediction",
    type,
    outcomes: type === "bool" ? ["Yes", "No"] : [],
    category: "general",
    language: "en_US",
  };
}

function looksLikeUintAnswer(normalized: string): boolean {
  if (normalized === ZERO_ANSWER.toLowerCase() || normalized === ONE_ANSWER.toLowerCase()) {
    return false;
  }
  try {
    const value = BigInt(normalized);
    return value >= 0n && value < 2n ** 128n;
  } catch {
    return false;
  }
}

function decodeUintAnswer(answerHex: string): string | null {
  try {
    const value = BigInt(answerHex);
    if (value < 0n || value >= 2n ** 128n) return null;
    return value.toString();
  } catch {
    return null;
  }
}

/** Map small integer answers to outcome labels (Precog-style ordinal indexing). */
function outcomeLabelFromIndex(
  answerHex: string,
  outcomes: string[]
): string | null {
  if (outcomes.length === 0) return null;
  try {
    const value = BigInt(answerHex);
    if (value < 0n || value >= BigInt(outcomes.length + 1)) return null;
    // Try 1-based index first (answer 1 → outcomes[0])
    if (value >= 1n && value <= BigInt(outcomes.length)) {
      return outcomes[Number(value) - 1];
    }
    // Then 0-based index
    if (value < BigInt(outcomes.length)) {
      return outcomes[Number(value)];
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Map bytes32 answer to human-readable label.
 */
export function answerBytesToLabel(
  answerHex: string | null | undefined,
  parsed: ParsedPredictionDisplay,
  typeOverride?: QuestionType | null
): string | null {
  if (!answerHex || (answerHex === ZERO_ANSWER && parsed.type !== "bool")) {
    return null;
  }

  const effectiveType = typeOverride ?? parsed.type;
  const normalized = answerHex.toLowerCase();

  if (effectiveType === "bool") {
    if (/^0x0*1$/.test(normalized)) return "Yes";
    if (/^0x0+$/.test(normalized)) return "No";
  }

  if (effectiveType === "uint") {
    const indexLabel = outcomeLabelFromIndex(answerHex, parsed.outcomes);
    if (indexLabel) return indexLabel;
    return decodeUintAnswer(answerHex) ?? answerHex;
  }

  for (const outcome of parsed.outcomes) {
    try {
      const hash = keccak256(stringToHex(outcome)).toLowerCase();
      if (hash === normalized) return outcome;
    } catch {
      continue;
    }
  }

  if (normalized === ONE_ANSWER.toLowerCase()) return "Yes";
  if (normalized === ZERO_ANSWER.toLowerCase()) return "No";

  if (looksLikeUintAnswer(normalized)) {
    const indexLabel = outcomeLabelFromIndex(answerHex, parsed.outcomes);
    if (indexLabel) return indexLabel;
    return decodeUintAnswer(answerHex);
  }

  return answerHex.length > 18
    ? `${answerHex.slice(0, 10)}…${answerHex.slice(-6)}`
    : answerHex;
}

export function formatCategoryLabel(category: string | null | undefined): string {
  if (!category) return "";
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeCategoryKey(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSongchainCategory(category: string): boolean {
  return normalizeCategoryKey(category) === "songchain";
}
