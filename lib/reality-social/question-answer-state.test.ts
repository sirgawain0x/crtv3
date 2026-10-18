import { describe, expect, it } from "vitest";
import {
  isUnansweredNewQuestion,
  questionHasBondedAnswer,
  questionIsAnswered,
} from "@/lib/reality-social/question-answer-state";
import { mapGraphQuestionToRow } from "@/lib/reality-social/map-graph-question";

const CONTRACT = "0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8";
const ZERO =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("Reality.eth answer semantics (bond-based)", () => {
  it("treats empty best_answer with zero bond as unanswered / new", () => {
    const row = {
      id: "0xabc",
      question: "Will it rain?",
      created: "100",
      best_answer: "0x",
      last_bond_ts: "100",
      last_bond: "0",
      bounty: "0",
      template_id: "2",
      finalize_ts: null,
    };

    expect(isUnansweredNewQuestion(row)).toBe(true);
    expect(questionHasBondedAnswer(row)).toBe(false);

    const mapped = mapGraphQuestionToRow(row, CONTRACT);
    expect(mapped.currentAnswer).toBeNull();
    expect(mapped.currentAnswerTimestamp).toBeNull();
  });

  it("treats zero-bytes32 answer with bond as answered No", () => {
    const row = {
      id: "0xdef",
      question: "Yes or no?",
      created: "100",
      best_answer: ZERO,
      last_bond_ts: "200",
      last_bond: "1000000000",
      bounty: "0",
      template_id: "2",
      finalize_ts: null,
    };

    expect(questionHasBondedAnswer(row)).toBe(true);
    expect(isUnansweredNewQuestion(row)).toBe(false);

    const mapped = mapGraphQuestionToRow(row, CONTRACT);
    expect(mapped.currentAnswer).toBe(ZERO);
    expect(mapped.currentAnswerTimestamp).toBe("200");
    expect(mapped.currentAnswerBond).toBe("1000000000");
  });

  it("treats non-zero answer with bond as answered", () => {
    const row = {
      id: "0xghi",
      question: "Yes or no?",
      created: "100",
      best_answer:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      last_bond_ts: "250",
      last_bond: "500000000000000",
      bounty: "0",
      template_id: "2",
      finalize_ts: null,
    };

    expect(questionHasBondedAnswer(row)).toBe(true);
    const mapped = mapGraphQuestionToRow(row, CONTRACT);
    expect(mapped.currentAnswer).toBe(row.best_answer);
    expect(mapped.currentAnswerTimestamp).toBe("250");
  });

  it("treats arbitrated 0x0 No with zero bond and finalize_ts as answered", () => {
    const row = {
      id: "0xarb",
      question: "Disputed?",
      created: "100",
      best_answer: ZERO,
      last_bond_ts: "400",
      last_bond: "0",
      bounty: "0",
      template_id: "2",
      finalize_ts: "400",
    };

    expect(questionIsAnswered(row)).toBe(true);
    expect(isUnansweredNewQuestion(row)).toBe(false);

    const mapped = mapGraphQuestionToRow(row, CONTRACT);
    expect(mapped.currentAnswer).toBe(ZERO);
    expect(mapped.currentAnswerTimestamp).toBe("400");
    expect(mapped.currentAnswerBond).toBe("0");
  });
});
