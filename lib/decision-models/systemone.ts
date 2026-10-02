import {
  getDecisionModel,
  getDecisionModelTimeoutMs,
  getTypeSafeApiKey,
  getTypeSafeBaseUrl,
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
  /** Max attempts for 429/529 (includes the first try). Default 3. */
  maxRetries?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  /** Injected for tests. */
  sleepImpl?: (ms: number) => Promise<void>;
  baseUrl?: string | null;
  apiKey?: string | null;
};

const RETRYABLE_STATUSES = new Set([429, 529]);
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Honor `Retry-After` (seconds or HTTP-date). Fall back to exponential backoff.
 * @see https://docs.typesafe.ai/api.md#handling-rate-limits
 * @see https://docs.typesafe.ai/models.md
 */
export function retryAfterDelayMs(
  res: Response,
  attemptIndex: number
): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const asSeconds = Number(header);
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(asSeconds * 1000, MAX_BACKOFF_MS);
    }
    const asDate = Date.parse(header);
    if (!Number.isNaN(asDate)) {
      return Math.min(Math.max(0, asDate - Date.now()), MAX_BACKOFF_MS);
    }
  }
  return Math.min(DEFAULT_BACKOFF_MS * 2 ** attemptIndex, MAX_BACKOFF_MS);
}

/**
 * Call TypeSafe `POST /v1/systemone` with typed decision questions (Jev).
 * Returns null when `TYPESAFE_API_KEY` is not configured.
 *
 * Retries 429 / 529 with exponential backoff and honors `Retry-After`.
 * Each attempt gets its own timeout so backoff sleep does not burn the budget.
 *
 * Default model alias `jev-latest` currently resolves to `jev-1.13.0`.
 * Input tokens are billed (~$0.042 / Mtok); output tokens are free.
 *
 * @see https://docs.typesafe.ai/api.md
 * @see https://docs.typesafe.ai/models.md
 */
export async function systemOne(
  state: string | Record<string, unknown> | unknown[],
  questions: Record<string, SystemOneQuestion>,
  options: SystemOneCallOptions = {}
): Promise<SystemOneResponse | null> {
  const apiKey =
    options.apiKey === undefined ? getTypeSafeApiKey() : options.apiKey;
  if (!apiKey) return null;

  const baseUrl =
    options.baseUrl === undefined ? getTypeSafeBaseUrl() : options.baseUrl;
  if (!baseUrl) return null;

  const model = options.model ?? getDecisionModel(options.role ?? "routing");
  const timeoutMs = options.timeoutMs ?? getDecisionModelTimeoutMs();
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? sleep;
  const maxRetries = Math.max(1, options.maxRetries ?? DEFAULT_MAX_RETRIES);

  let lastErrorText = "";
  let lastStatus = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(`${baseUrl}/v1/systemone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, state, questions }),
        signal: controller.signal,
      });

      if (res.ok) {
        const json = (await res.json()) as SystemOneResponse;
        if (!json || typeof json !== "object" || !json.answers) {
          throw new DecisionModelError("Decision model returned an invalid body");
        }
        return json;
      }

      lastStatus = res.status;
      lastErrorText = await res.text().catch(() => "");

      if (RETRYABLE_STATUSES.has(res.status) && attempt < maxRetries - 1) {
        // Sleep outside this attempt's timeout so Retry-After does not abort the next try.
        clearTimeout(timer);
        await sleepImpl(retryAfterDelayMs(res, attempt));
        continue;
      }

      throw new DecisionModelError(
        `Decision model HTTP ${res.status}: ${lastErrorText.slice(0, 200)}`
      );
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

  throw new DecisionModelError(
    `Decision model HTTP ${lastStatus}: ${lastErrorText.slice(0, 200)}`
  );
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
