import { resolveSubgraphEndpoints } from "@/lib/subgraph/creative-platform-proxy";

const PER_QUERY = 100;

export type SubgraphQuestionRow = {
  id: string;
  createdTimestamp: string;
  contract: string;
  data: string;
  bounty: string;
  currentAnswer: string | null;
  currentAnswerTimestamp: string | null;
  currentAnswerBond: string | null;
  template: { questionText: string };
};

async function postGraphql<T>(
  endpoint: string,
  query: string,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Subgraph HTTP ${response.status} (${endpoint})`);
  }
  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }
  if (!payload.data) {
    throw new Error("Subgraph returned no data");
  }
  return payload.data;
}

async function queryWithFallback<T>(
  query: string,
  pick: (data: T) => unknown,
): Promise<T> {
  const endpoints = resolveSubgraphEndpoints("reality-eth");
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const data = await postGraphql<T>(endpoint, query);
      pick(data);
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All Reality.eth subgraph endpoints failed");
}

export async function fetchNewAndAnsweredQuestions(
  afterTimestamp: number,
): Promise<SubgraphQuestionRow[]> {
  const ts = Math.max(0, afterTimestamp);

  const newQuestionsQuery = `
    {
      questions(
        orderBy: createdTimestamp
        orderDirection: asc
        first: ${PER_QUERY}
        where: { createdTimestamp_gt: ${ts}, currentAnswerTimestamp: null }
      ) {
        id
        createdTimestamp
        contract
        data
        bounty
        currentAnswer
        currentAnswerTimestamp
        currentAnswerBond
        template { questionText }
      }
    }
  `;

  const answeredQuery = `
    {
      questions(
        orderBy: currentAnswerTimestamp
        orderDirection: asc
        first: ${PER_QUERY}
        where: { currentAnswerTimestamp_gt: ${ts} }
      ) {
        id
        createdTimestamp
        contract
        data
        bounty
        currentAnswer
        currentAnswerTimestamp
        currentAnswerBond
        template { questionText }
      }
    }
  `;

  type QuestionPayload = { questions: SubgraphQuestionRow[] };

  const [newData, answeredData] = await Promise.all([
    queryWithFallback<QuestionPayload>(newQuestionsQuery, (d) => d.questions),
    queryWithFallback<QuestionPayload>(answeredQuery, (d) => d.questions),
  ]);

  return [...newData.questions, ...answeredData.questions];
}
