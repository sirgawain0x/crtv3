import {
  getDecisionModel,
  getDecisionModelTimeoutMs,
  getOllamaBaseUrl,
  type DecisionModelRole,
} from "./config";
import {
  DecisionModelError,
  type SystemOneQuestion,
  type SystemOneResponse,
} from "./types";

export type SystemOneCallOptions = {
  role?: DecisionModelRole;
  model?: string;
  timeoutMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  baseUrl?: string | null;
};

/**
 * Call Ollama `/v1/systemone` with typed decision questions.
 * Returns null when decision models are not configured (no base URL).
 */
export async function systemOne(
  state: string | Record<string, unknown> | unknown[],
  questions: Record<string, SystemOneQuestion>,
  options: SystemOneCallOptions = {}
): Promise<SystemOneResponse | null> {
  const baseUrl =
    options.baseUrl === undefined ? getOllamaBaseUrl() : options.baseUrl;
  if (!baseUrl) return null;

  const model = options.model ?? getDecisionModel(options.role ?? "routing");
  const timeoutMs = options.timeoutMs ?? getDecisionModelTimeoutMs();
  const fetchImpl = options.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(`${baseUrl}/v1/systemone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, state, questions }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DecisionModelError(
        `Decision model HTTP ${res.status}: ${text.slice(0, 200)}`
      );
    }

    const json = (await res.json()) as SystemOneResponse;
    if (!json || typeof json !== "object" || !json.answers) {
      throw new DecisionModelError("Decision model returned an invalid body");
    }
    return json;
  } catch (err) {
    if (err instanceof DecisionModelError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new DecisionModelError("Decision model request timed out", err);
    }
    throw new DecisionModelError(
      err instanceof Error ? err.message : "Decision model request failed",
      err
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Safe wrapper: returns null on misconfig or any failure (never throws). */
export async function trySystemOne(
  state: string | Record<string, unknown> | unknown[],
  questions: Record<string, SystemOneQuestion>,
  options: SystemOneCallOptions = {}
): Promise<SystemOneResponse | null> {
  try {
    return await systemOne(state, questions, options);
  } catch {
    return null;
  }
}
