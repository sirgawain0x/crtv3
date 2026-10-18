import type { GraphQuestionEntity } from "@/lib/reality-social/reality-social-subgraph-queries";

/** Reality.eth: a posted answer carries a non-zero bond (`last_bond`). */
export function questionHasBondedAnswer(
  row: Pick<GraphQuestionEntity, "last_bond">,
): boolean {
  const raw = row.last_bond?.trim();
  if (!raw) return false;
  try {
    return BigInt(raw) > 0n;
  } catch {
    return false;
  }
}

/** New question with no answer yet (subgraph uses empty `best_answer`, not 32 zero bytes). */
export function isUnansweredNewQuestion(
  row: Pick<GraphQuestionEntity, "last_bond" | "best_answer">,
): boolean {
  return !questionHasBondedAnswer(row);
}
