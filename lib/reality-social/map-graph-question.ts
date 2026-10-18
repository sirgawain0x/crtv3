import type { SubgraphQuestionRow } from "@/lib/reality-social/subgraph";
import type { GraphQuestionEntity } from "@/lib/reality-social/reality-social-subgraph-queries";
import { questionHasBondedAnswer } from "@/lib/reality-social/question-answer-state";

export function mapGraphQuestionToRow(
  row: GraphQuestionEntity,
  contractAddress: string,
): SubgraphQuestionRow {
  const hasAnswer = questionHasBondedAnswer(row);

  return {
    id: row.id,
    createdTimestamp: String(row.created),
    contract: contractAddress,
    data: row.question,
    bounty: String(row.bounty),
    currentAnswer: hasAnswer ? normalizeAnswerBytes(row.best_answer) : null,
    currentAnswerTimestamp: hasAnswer ? String(row.last_bond_ts) : null,
    currentAnswerBond: hasAnswer ? String(row.last_bond) : null,
    template: { questionText: row.question },
  };
}

function normalizeAnswerBytes(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value || value === "0x") {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
  return value;
}
