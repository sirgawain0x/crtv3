/**
 * Lightweight Reality.eth question parsing for the social-sync cron.
 *
 * Avoids `@reality.eth/reality-eth-lib` → isomorphic-dompurify → jsdom →
 * html-encoding-sniffer → @exodus/bytes, which crashes under Node/Vercel with
 * ERR_REQUIRE_ESM (CJS require of an ESM-only package).
 *
 * Encoding matches Creative TV's unit-separator question format (`\u241F`).
 */
import { keccak256, stringToHex } from "viem";

const UNIT_SEP = "\u241F";

const ZERO_ANSWER =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ONE_ANSWER =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export type LocalParsedQuestion = {
  title: string;
  type: "bool" | "uint" | "single-select" | "multiple-select";
  outcomes: string[];
  category: string;
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

function inferTypeFromOutcomes(
  outcomes: string[]
): LocalParsedQuestion["type"] {
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
 * Parse encoded question `data` without loading reality-eth-lib / jsdom.
 * `templateText` is accepted for API symmetry but not required for unit-sep data.
 */
export function parseQuestionLocal(
  data: string,
  _templateText?: string
): LocalParsedQuestion | null {
  const raw = (data ?? "").trim();
  if (!raw) return null;

  const parts = raw.split(UNIT_SEP);
  const title = parts[0]?.trim() || "";
  if (!title || title.startsWith("[Badly formatted question]")) {
    return null;
  }

  const outcomes = parts[1] ? parseOutcomesSegment(parts[1]) : [];
  const language =
    parts[parts.length - 1]?.trim().match(/^[a-z]{2}_[A-Z]{2}$/)
      ? parts[parts.length - 1].trim()
      : "";
  const category =
    language && parts.length >= 3
      ? parts[parts.length - 2]?.trim() || "general"
      : parts[parts.length - 1]?.trim() || "general";

  const type = inferTypeFromOutcomes(outcomes);

  return {
    title,
    type,
    outcomes: outcomes.length ? outcomes : type === "bool" ? ["Yes", "No"] : [],
    category: category || "general",
  };
}

function decodeUintAnswer(answerHex: string): string | null {
  try {
    return BigInt(answerHex).toString();
  } catch {
    return null;
  }
}

function outcomeLabelFromIndex(
  answerHex: string,
  outcomes: string[]
): string | null {
  if (outcomes.length === 0) return null;
  try {
    const value = BigInt(answerHex);
    if (value >= 1n && value <= BigInt(outcomes.length)) {
      return outcomes[Number(value) - 1];
    }
    if (value >= 0n && value < BigInt(outcomes.length)) {
      return outcomes[Number(value)];
    }
  } catch {
    return null;
  }
  return null;
}

/** Map bytes32 answer to a human label without reality-eth-lib. */
export function answerStringLocal(
  parsed: LocalParsedQuestion,
  answerHex: string | null | undefined
): string {
  if (!answerHex) return "";
  const normalized = answerHex.toLowerCase();

  if (parsed.type === "bool") {
    if (normalized === ONE_ANSWER.toLowerCase()) return "Yes";
    if (normalized === ZERO_ANSWER.toLowerCase()) return "No";
  }

  if (parsed.type === "uint") {
    const indexLabel = outcomeLabelFromIndex(answerHex, parsed.outcomes);
    if (indexLabel) return indexLabel;
    return decodeUintAnswer(answerHex) ?? answerHex;
  }

  for (const outcome of parsed.outcomes) {
    try {
      if (keccak256(stringToHex(outcome)).toLowerCase() === normalized) {
        return outcome;
      }
    } catch {
      // continue
    }
  }

  if (normalized === ONE_ANSWER.toLowerCase()) return "Yes";
  if (normalized === ZERO_ANSWER.toLowerCase()) return "No";

  const indexLabel = outcomeLabelFromIndex(answerHex, parsed.outcomes);
  if (indexLabel) return indexLabel;

  return answerHex.length > 18
    ? `${answerHex.slice(0, 10)}…${answerHex.slice(-6)}`
    : answerHex;
}
