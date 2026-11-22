import { describe, expect, it } from "vitest";
import { keccak256, stringToHex } from "viem";
import standardTemplates from "@reality.eth/contracts/config/templates.json";
import {
  answerStringLocal,
  parseQuestionLocal,
} from "./parse-question-local";

const SEP = "\u241F";

describe("parseQuestionLocal", () => {
  it("parses bool-style unit-separator encoding", () => {
    const data = `Will ETH flip BTC?${SEP}${SEP}finance${SEP}en_US`;
    const parsed = parseQuestionLocal(data);
    expect(parsed?.title).toBe("Will ETH flip BTC?");
    expect(parsed?.type).toBe("bool");
    expect(parsed?.outcomes).toEqual(["Yes", "No"]);
    expect(parsed?.category).toBe("finance");
  });

  it("parses select outcomes from JSON segment", () => {
    const data = `Who wins?${SEP}["Alice","Bob","Carol"]${SEP}sports${SEP}en_US`;
    const parsed = parseQuestionLocal(data);
    expect(parsed?.title).toBe("Who wins?");
    expect(parsed?.type).toBe("single-select");
    expect(parsed?.outcomes).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("returns null for empty or badly formatted titles", () => {
    expect(parseQuestionLocal("")).toBeNull();
    expect(parseQuestionLocal(`[Badly formatted question]${SEP}${SEP}en_US`)).toBeNull();
  });

  it("uses numeric template text supplied by social sync", () => {
    const parsed = parseQuestionLocal(`How many?${SEP}finance${SEP}de_DE`, standardTemplates.content["1"]);
    expect(parsed).toEqual({
      title: "How many?", type: "uint", outcomes: [], category: "finance", language: "de_DE",
    });
    expect(answerStringLocal(parsed!, "0x" + "0".repeat(63) + "1")).toBe("1");
    expect(answerStringLocal(parsed!, "0x" + "0".repeat(64))).toBe("0");
  });

  it.each(["single-select", "multiple-select"] as const)("honors %s template text even for Yes/No outcomes", (type) => {
    const template = type === "single-select" ? standardTemplates.content["2"] : standardTemplates.content["3"];
    const parsed = parseQuestionLocal(`Choose?${SEP}"Yes","No"${SEP}general${SEP}en_US`, template);
    expect(parsed?.type).toBe(type);
    expect(parsed?.outcomes).toEqual(["Yes", "No"]);
  });

  it("supports legacy empty outcome slots in numeric questions", () => {
    const parsed = parseQuestionLocal(`How many?${SEP}${SEP}general${SEP}en_US`, standardTemplates.content["1"]);
    expect(parsed?.type).toBe("uint");
    expect(parsed?.outcomes).toEqual([]);
    expect(parsed?.category).toBe("general");
  });

  it("retains safe defaults for a plain title or malformed template text", () => {
    expect(parseQuestionLocal("Will it happen?", "not a template")).toEqual({
      title: "Will it happen?", type: "bool", outcomes: ["Yes", "No"], category: "general", language: "en_US",
    });
  });
});

describe("answerStringLocal", () => {
  it("maps bool answers", () => {
    const parsed = parseQuestionLocal(`Yes or no?${SEP}${SEP}general${SEP}en_US`)!;
    expect(
      answerStringLocal(
        parsed,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      )
    ).toBe("Yes");
    expect(
      answerStringLocal(
        parsed,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      )
    ).toBe("No");
  });

  it("maps hashed select outcomes", () => {
    const parsed = parseQuestionLocal(
      `Pick one${SEP}["Red","Blue"]${SEP}general${SEP}en_US`
    )!;
    const redHash = keccak256(stringToHex("Red"));
    expect(answerStringLocal(parsed, redHash)).toBe("Red");
  });
});
