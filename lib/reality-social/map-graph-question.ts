import type { SubgraphQuestionRow } from "@/lib/reality-social/subgraph";
import {
  ZERO_BEST_ANSWER,
  type GraphQuestionEntity,
} from "@/lib/reality-social/reality-social-subgraph-queries";

export function mapGraphQuestionToRow(
  row: GraphQuestionEntity,
  contractAddress: string,
): SubgraphQuestionRow {
  const hasAnswer =
    row.best_answer?.toLowerCase() !== ZERO_BEST_ANSWER.toLowerCase();

  return {
    id: row.id,
    createdTimestamp: String(row.created),
    contract: contractAddress,
    data: row.question,
    bounty: String(row.bounty),
    currentAnswer: hasAnswer ? row.best_answer : null,
    currentAnswerTimestamp: hasAnswer ? String(row.last_bond_ts) : null,
    currentAnswerBond: hasAnswer ? String(row.last_bond) : null,
    template: { questionText: row.question },
  };
}
