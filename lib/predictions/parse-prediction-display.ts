import { keccak256, stringToHex } from "viem";
import type { QuestionType } from "@/lib/sdk/reality-eth/reality-eth-utils";
import { parseQuestionLocal } from "@/lib/reality-social/parse-question-local";

const UNIT_SEP = "\u241F";

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

function parseOutcomesSegment(segment: string): string[] {
  const trimmed = segment.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // fall through
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .split('","')
      .map((s) => s.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }
  return trimmed
    .split(",")
    .map((s) => s.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function inferTypeFromOutcomes(outcomes: string[]): ParsedPredictionDisplay["type"] {
  if (outcomes.length === 2) {
    const lower = outcomes.map((o) => o.toLowerCase());
    if (
      (lower[0] === "yes" && lower[1] === "no") ||
      (lower[0] === "no" && lower[1] === "yes")
    ) {
      return "bool";
    }
    return "single-select";
  }
  if (outcomes.length > 2) return "single-select";
  return "bool";
}

/** Mirrors Reality.eth template IDs from `getTemplateIdForQuestionType` / templates.json. */
const REALITY_TEMPLATE_ID_TO_TYPE: Record<
  number,
  ParsedPredictionDisplay["type"]
> = {
  0: "bool",
  1: "uint",
  2: "single-select",
  3: "multiple-select",
};

function applyTemplateIdToDisplay(
  parsed: ParsedPredictionDisplay,
  templateId?: string | number | bigint | null
): ParsedPredictionDisplay {
  if (templateId == null) return parsed;
  const id = Number(templateId);
  if (!Number.isFinite(id)) return parsed;

  const fromTemplate = REALITY_TEMPLATE_ID_TO_TYPE[id];
  if (!fromTemplate) return parsed;

  const next = { ...parsed, type: fromTemplate };
  if (fromTemplate === "uint") {
    next.outcomes = [];
  } else if (fromTemplate === "bool" && next.outcomes.length === 0) {
    next.outcomes = ["Yes", "No"];
  }
  return next;
}

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
  if (!raw) {
    return {
      title: "Untitled Prediction",
      type: "bool",
      outcomes: ["Yes", "No"],
      category: "general",
      language: "en_US",
    };
  }

  // Unit-separator format (Creative TV default). Avoid @reality.eth/reality-eth-lib here —
  // it pulls jsdom/html-encoding-sniffer and crashes Vercel Node (ERR_REQUIRE_ESM).
  const local = parseQuestionLocal(raw);
  if (local) {
    return applyTemplateIdToDisplay(
      {
        ...local,
        language: "en_US",
      },
      templateId
    );
  }

  const parts = raw.split(UNIT_SEP);
  const title = parts[0]?.trim() || raw;
  const outcomes = parts[1] ? parseOutcomesSegment(parts[1]) : [];
  const category = parts[parts.length - 2]?.trim() || parts[parts.length - 1]?.trim() || "general";
  const language =
    parts[parts.length - 1]?.trim().match(/^[a-z]{2}_[A-Z]{2}$/)
      ? parts[parts.length - 1].trim()
      : "en_US";

  const resolvedCategory =
    language.match(/^[a-z]{2}_[A-Z]{2}$/) && parts.length >= 3
      ? parts[parts.length - 2]?.trim() || "general"
      : category;

  const type = inferTypeFromOutcomes(outcomes);

  return applyTemplateIdToDisplay(
    {
      title,
      type,
      outcomes: outcomes.length ? outcomes : type === "bool" ? ["Yes", "No"] : [],
      category: resolvedCategory,
      language: language.match(/^[a-z]{2}_[A-Z]{2}$/) ? language : "en_US",
    },
    templateId
  );
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
    if (normalized === ONE_ANSWER.toLowerCase()) return "Yes";
    if (normalized === ZERO_ANSWER.toLowerCase()) return "No";
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
