/**
 * TypeSafe System One (Jev) configuration.
 *
 * When `TYPESAFE_API_KEY` is unset, all gates fall back to existing
 * non-model behavior (substring match, advisory no-ops, etc.).
 *
 * Default model alias `jev-latest` → `jev-1.13.0` (see Models docs).
 * Pin `TYPESAFE_MODEL=jev-1.13.0` if thresholds are tuned to that version.
 * Pricing (Jev 1.13): ~$0.042 / Mtok input; output free. Text-only state.
 *
 * @see https://docs.typesafe.ai/api.md
 * @see https://docs.typesafe.ai/models.md
 */

export type DecisionModelRole = "routing" | "strict";

const DEFAULT_BASE_URL = "https://api.typesafe.ai";
/** Alias for the current stable Jev release (`jev-1.13.0` as of Models docs). */
const DEFAULT_MODEL = "jev-latest";

export function getTypeSafeBaseUrl(): string {
  const raw = process.env.TYPESAFE_BASE_URL?.trim();
  if (!raw) return DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

/** @deprecated Use getTypeSafeBaseUrl — kept for older call sites/tests. */
export function getOllamaBaseUrl(): string | null {
  if (!isDecisionModelConfigured()) return null;
  return getTypeSafeBaseUrl();
}

export function getTypeSafeApiKey(): string | null {
  const key =
    process.env.TYPESAFE_API_KEY?.trim() ||
    // Accept Ollama Cloud-style env if already set from earlier experiments.
    process.env.OLLAMA_API_KEY?.trim() ||
    null;
  return key || null;
}

export function isDecisionModelConfigured(): boolean {
  return Boolean(getTypeSafeApiKey());
}

/**
 * Both routing and strict gates use Jev. Role is retained so call sites stay
 * stable; optional env overrides still apply if you pin a versioned ID.
 */
export function getDecisionModel(_role: DecisionModelRole = "routing"): string {
  return (
    process.env.TYPESAFE_MODEL?.trim() ||
    process.env.OLLAMA_DECISION_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

export function getDecisionModelTimeoutMs(): number {
  const raw =
    process.env.TYPESAFE_TIMEOUT_MS?.trim() ||
    process.env.OLLAMA_DECISION_TIMEOUT_MS?.trim();
  if (!raw) return 15_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 15_000;
}
