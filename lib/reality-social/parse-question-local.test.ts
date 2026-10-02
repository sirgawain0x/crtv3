import { describe, expect, it } from "vitest";
import { keccak256, stringToHex } from "viem";
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
