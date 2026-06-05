import { keccak256, stringToHex } from "viem";
import { parseQuestionText } from "@/lib/sdk/reality-eth/reality-eth-utils";

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

/** Reality.eth standard template strings by template id */
const TEMPLATE_BY_ID: Record<number, string> = {
  0: `␟␟␟␟`,
  1: `␟␟␟`,
  2: `␟␟␟␟`,
};

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

  const tid = templateId != null ? Number(templateId) : NaN;
  if (!Number.isNaN(tid) && TEMPLATE_BY_ID[tid] !== undefined) {
    try {
      const parsed = parseQuestionText(TEMPLATE_BY_ID[tid], raw);
      const outcomes = Array.isArray(parsed.outcomes)
        ? parsed.outcomes.map(String)
        : parseOutcomesSegment(String(parsed.outcomes ?? ""));
      const type = (parsed.type as ParsedPredictionDisplay["type"]) ?? inferTypeFromOutcomes(outcomes);
      return {
        title: String(parsed.title ?? raw.split(UNIT_SEP)[0] ?? raw),
        type,
        outcomes: outcomes.length ? outcomes : type === "bool" ? ["Yes", "No"] : [],
        category: String(parsed.category ?? "general"),
        language: String(parsed.language ?? "en_US"),
        description: parsed.description ? String(parsed.description) : undefined,
      };
    } catch {
      // fall through to manual split
    }
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

  return {
    title,
    type,
    outcomes: outcomes.length ? outcomes : type === "bool" ? ["Yes", "No"] : [],
    category: resolvedCategory,
    language: language.match(/^[a-z]{2}_[A-Z]{2}$/) ? language : "en_US",
  };
}

/**
 * Map bytes32 answer to human-readable label.
 */
export function answerBytesToLabel(
  answerHex: string | null | undefined,
  parsed: ParsedPredictionDisplay
): string | null {
  if (!answerHex || (answerHex === ZERO_ANSWER && parsed.type !== "bool")) {
    return null;
  }

  const normalized = answerHex.toLowerCase();

  if (parsed.type === "bool") {
    if (normalized === ONE_ANSWER.toLowerCase()) return "Yes";
    if (normalized === ZERO_ANSWER.toLowerCase()) return "No";
  }

  if (parsed.type === "uint") {
    try {
      return BigInt(answerHex).toString();
    } catch {
      return answerHex;
    }
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
