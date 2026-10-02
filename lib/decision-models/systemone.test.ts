import { afterEach, describe, expect, it, vi } from "vitest";
import { retryAfterDelayMs, systemOne, trySystemOne } from "./systemone";
import { DecisionModelError } from "./types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("systemOne (TypeSafe Jev)", () => {
  it("returns null when TYPESAFE_API_KEY is unset", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    vi.stubEnv("OLLAMA_API_KEY", "");
    const result = await systemOne("hello", {
      q: { type: "noul", instructions: "Is greeting?" },
    });
    expect(result).toBeNull();
  });

  it("posts to TypeSafe /v1/systemone with Bearer auth", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "tsk_test");
    vi.stubEnv("TYPESAFE_MODEL", "jev-latest");

    const fetchImpl = vi.fn(async () =>
      Response.json({
        model: "jev-1.13.0",
        answers: { q: { type: "noul", noul: 0.91 } },
        usage: { input_tokens: 120, output_tokens: 8 },
      })
    );

    const result = await systemOne(
      "Hello World",
      { q: { type: "noul", instructions: "Is greeting?" } },
      { fetchImpl: fetchImpl as unknown as typeof fetch, role: "routing" }
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tsk_test");
    expect(JSON.parse((init as RequestInit).body as string).model).toBe(
      "jev-latest"
    );
    expect(result?.model).toBe("jev-1.13.0");
    expect(result?.answers.q).toEqual({ type: "noul", noul: 0.91 });
  });

  it("retries 429 when Retry-After is present, then succeeds", async () => {
    const sleepImpl = vi.fn(async () => undefined);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("slow down", {
          status: 429,
          headers: { "retry-after": "0" },
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          model: "jev-1.13.0",
          answers: { q: { type: "noul", noul: 0.5 } },
        })
      );

    const result = await systemOne(
      "x",
      { q: { type: "noul", instructions: "y" } },
      {
        apiKey: "tsk_test",
        baseUrl: "https://api.typesafe.ai",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl,
        maxRetries: 3,
      }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledOnce();
    expect(result?.answers.q).toEqual({ type: "noul", noul: 0.5 });
  });

  it("retries 529 Overloaded once then throws if still failing", async () => {
    const sleepImpl = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async () => new Response("busy", { status: 529 }));

    await expect(
      systemOne(
        "x",
        { q: { type: "noul", instructions: "y" } },
        {
          apiKey: "tsk_test",
          baseUrl: "https://api.typesafe.ai",
          fetchImpl: fetchImpl as unknown as typeof fetch,
          sleepImpl,
          maxRetries: 2,
        }
      )
    ).rejects.toBeInstanceOf(DecisionModelError);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledOnce();
  });

  it("throws DecisionModelError on non-retryable HTTP failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      systemOne(
        "x",
        { q: { type: "noul", instructions: "y" } },
        {
          apiKey: "tsk_test",
          baseUrl: "https://api.typesafe.ai",
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }
      )
    ).rejects.toBeInstanceOf(DecisionModelError);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("trySystemOne swallows errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const result = await trySystemOne(
      "x",
      { q: { type: "noul", instructions: "y" } },
      {
        apiKey: "tsk_test",
        baseUrl: "https://api.typesafe.ai",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }
    );
    expect(result).toBeNull();
  });
});

describe("retryAfterDelayMs", () => {
  it("prefers Retry-After seconds", () => {
    const res = new Response(null, {
      status: 429,
      headers: { "retry-after": "2" },
    });
    expect(retryAfterDelayMs(res, 0)).toBe(2000);
  });

  it("falls back to exponential backoff without header", () => {
    const res = new Response(null, { status: 429 });
    expect(retryAfterDelayMs(res, 0)).toBe(500);
    expect(retryAfterDelayMs(res, 1)).toBe(1000);
  });
});

