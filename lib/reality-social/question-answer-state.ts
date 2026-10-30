import type { GraphQuestionEntity } from "@/lib/reality-social/reality-social-subgraph-queries";

function hasPositiveBond(last_bond: string | undefined): boolean {
  const raw = last_bond?.trim();
  if (!raw) return false;
  try {
    return BigInt(raw) > 0n;
  } catch {
    return false;
  }
}

function hasFinalization(
  finalize_ts: GraphQuestionEntity["finalize_ts"],
): boolean {
  if (finalize_ts == null) return false;
  const raw = String(finalize_ts).trim();
  if (!raw) return false;
  try {
    return BigInt(raw) >= 0n;
  } catch {
    return false;
  }
}

/** Answered: bonded submission or arbitrator finalization (bond may be 0). */
export function questionIsAnswered(
  row: Pick<GraphQuestionEntity, "last_bond" | "finalize_ts">,
): boolean {
  return hasPositiveBond(row.last_bond) || hasFinalization(row.finalize_ts);
}

/** @deprecated alias used in tests */
export function questionHasBondedAnswer(
  row: Pick<GraphQuestionEntity, "last_bond" | "finalize_ts">,
): boolean {
  return questionIsAnswered(row);
}

/** New question with no answer yet (empty `best_answer`, no bond, not finalized). */
export function isUnansweredNewQuestion(
  row: Pick<
    GraphQuestionEntity,
    "last_bond" | "best_answer" | "finalize_ts"
  >,
): boolean {
  return !questionIsAnswered(row);
}
