/**
 * Ollama / TypeSafe decision-model configuration.
 *
 * When `OLLAMA_BASE_URL` is unset, all gates fall back to existing
 * non-model behavior (substring match, advisory no-ops, etc.).
 */

export type DecisionModelRole = "routing" | "strict";

export function getOllamaBaseUrl(): string | null {
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isDecisionModelConfigured(): boolean {
  return Boolean(getOllamaBaseUrl());
}

/**
 * Routing (high volume): tev1:4b by default.
 * Strict (policy / resolvability / moderation): nimble by default.
 */
export function getDecisionModel(role: DecisionModelRole = "routing"): string {
  if (role === "strict") {
    return (
      process.env.OLLAMA_DECISION_MODEL_STRICT?.trim() ||
      process.env.OLLAMA_DECISION_MODEL?.trim() ||
      "nimble"
    );
  }
  return (
    process.env.OLLAMA_DECISION_MODEL_ROUTING?.trim() ||
    process.env.OLLAMA_DECISION_MODEL?.trim() ||
    "tev1:4b"
  );
}

export function getDecisionModelTimeoutMs(): number {
  const raw = process.env.OLLAMA_DECISION_TIMEOUT_MS?.trim();
  if (!raw) return 8_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 8_000;
}
