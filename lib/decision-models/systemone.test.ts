import { afterEach, describe, expect, it, vi } from "vitest";
import { systemOne, trySystemOne } from "./systemone";
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
    expect(result?.answers.q).toEqual({ type: "noul", noul: 0.91 });
  });

  it("throws DecisionModelError on HTTP failure", async () => {
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
