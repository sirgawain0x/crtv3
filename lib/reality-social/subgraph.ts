import { getRealityEthContractAddress } from "@/lib/sdk/reality-eth/reality-eth-client";
import {
  buildSubgraphRequestHeaders,
  resolveSubgraphEndpoints,
} from "@/lib/subgraph/creative-platform-proxy";
import {
  buildSocialSyncQuestionQueries,
  type GraphQuestionEntity,
} from "@/lib/reality-social/reality-social-subgraph-queries";
import { mapGraphQuestionToRow } from "@/lib/reality-social/map-graph-question";

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
  const headers = buildSubgraphRequestHeaders(endpoint);
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
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
  const contractAddress = getRealityEthContractAddress();
  const { newQuestionsQuery, answeredQuestionsQuery } =
    buildSocialSyncQuestionQueries(afterTimestamp);

  type QuestionPayload = { questions: GraphQuestionEntity[] };

  const [newData, answeredData] = await Promise.all([
    queryWithFallback<QuestionPayload>(newQuestionsQuery, (d) => d.questions),
    queryWithFallback<QuestionPayload>(
      answeredQuestionsQuery,
      (d) => d.questions,
    ),
  ]);

  const byId = new Map<string, SubgraphQuestionRow>();
  for (const row of [...newData.questions, ...answeredData.questions]) {
    byId.set(row.id, mapGraphQuestionToRow(row, contractAddress));
  }
  return [...byId.values()];
}
