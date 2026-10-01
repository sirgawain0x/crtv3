import { afterEach, describe, expect, it, vi } from "vitest";
import { systemOne, trySystemOne } from "./systemone";
import { DecisionModelError } from "./types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("systemOne", () => {
  it("returns null when OLLAMA_BASE_URL is unset", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    const result = await systemOne("hello", {
      q: { type: "noul", instructions: "Is greeting?" },
    });
    expect(result).toBeNull();
  });

  it("posts to /v1/systemone and returns answers", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubEnv("OLLAMA_DECISION_MODEL_ROUTING", "tev1:4b");

    const fetchImpl = vi.fn(async () =>
      Response.json({
        model: "tev1:4b",
        answers: { q: { type: "noul", noul: 0.91 } },
      })
    );

    const result = await systemOne(
      "Hello World",
      { q: { type: "noul", instructions: "Is greeting?" } },
      { fetchImpl: fetchImpl as unknown as typeof fetch, role: "routing" }
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://ollama.test/v1/systemone");
    expect(JSON.parse((init as RequestInit).body as string).model).toBe(
      "tev1:4b"
    );
    expect(result?.answers.q).toEqual({ type: "noul", noul: 0.91 });
  });

  it("throws DecisionModelError on HTTP failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      systemOne(
        "x",
        { q: { type: "noul", instructions: "y" } },
        { baseUrl: "http://ollama.test", fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).rejects.toBeInstanceOf(DecisionModelError);
  });

  it("trySystemOne swallows errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const result = await trySystemOne(
      "x",
      { q: { type: "noul", instructions: "y" } },
      { baseUrl: "http://ollama.test", fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toBeNull();
  });
});
