import { buildSocialSyncWhereFilters } from "@/lib/reality-social/social-sync-where-filters";

const PER_QUERY = 100;

export type GraphQuestionEntity = {
  id: string;
  question: string;
  created: string;
  best_answer: string;
  last_bond_ts: string;
  last_bond: string;
  bounty: string;
  template_id: string;
  finalize_ts: string | null;
};

/** GraphQL documents for creative-platform / Graph Studio `Question` entity (not legacy Goldsky twitter-bot schema). */
export function buildSocialSyncQuestionQueries(afterTimestamp: number): {
  newQuestionsQuery: string;
  answeredQuestionsQuery: string;
} {
  const ts = Math.max(0, afterTimestamp);
  const { newQuestions: newWhere } = buildSocialSyncWhereFilters(ts);

  const fields = `
        id
        question
        created
        best_answer
        last_bond_ts
        last_bond
        bounty
        template_id
        finalize_ts`;

  const newQuestionsQuery = `
    {
      questions(
        orderBy: created
        orderDirection: asc
        first: ${PER_QUERY}
        where: { created_gt: ${newWhere.created_gt as number}, last_bond: "${newWhere.last_bond}", finalize_ts: null }
      ) {
        ${fields}
      }
    }
  `;

  const answeredQuestionsQuery = `
    {
      questions(
        orderBy: last_bond_ts
        orderDirection: asc
        first: ${PER_QUERY}
        where: {
          or: [
            { last_bond_ts_gt: ${ts}, last_bond_gt: "0" },
            { last_bond_ts_gt: ${ts}, finalize_ts_not: null }
          ]
        }
      ) {
        ${fields}
      }
    }
  `;

  return { newQuestionsQuery, answeredQuestionsQuery };
}
