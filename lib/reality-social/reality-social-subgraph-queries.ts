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
};

/** GraphQL documents for creative-platform / Graph Studio `Question` entity (not legacy Goldsky twitter-bot schema). */
export function buildSocialSyncQuestionQueries(afterTimestamp: number): {
  newQuestionsQuery: string;
  answeredQuestionsQuery: string;
} {
  const ts = Math.max(0, afterTimestamp);

  const fields = `
        id
        question
        created
        best_answer
        last_bond_ts
        last_bond
        bounty
        template_id`;

  const newQuestionsQuery = `
    {
      questions(
        orderBy: created
        orderDirection: asc
        first: ${PER_QUERY}
        where: { created_gt: ${ts}, last_bond: "0" }
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
        where: { last_bond_ts_gt: ${ts}, last_bond_gt: "0" }
      ) {
        ${fields}
      }
    }
  `;

  return { newQuestionsQuery, answeredQuestionsQuery };
}
