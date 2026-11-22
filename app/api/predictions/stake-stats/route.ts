import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { serverLogger } from "@/lib/utils/logger";
import {
  buildSubgraphRequestHeaders,
  formatGraphQlErrors,
  getGraphQlResponseErrors,
  isGraphQlResponseSuccessful,
  resolveSubgraphEndpoints,
} from "@/lib/subgraph/creative-platform-proxy";
import { computeListStakeSummary } from "@/lib/predictions/stake-stats";

const MAX_IDS = 25;

const STAKE_STATS_QUERY = `
  query GetQuestionsStakeStats($ids: [ID!]!) {
    questions(where: { id_in: $ids }) {
      id
      bounty
      last_bond
      answers {
        bond
      }
    }
  }
`;

type SubgraphQuestion = {
  id: string;
  bounty?: string;
  last_bond?: string;
  answers?: Array<{ bond: string }>;
};

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "predictions.stake-stats" });
  if (!access.allowed) return access.response;

  const rl = await rateLimiters.generous(request);
  if (rl) return withPlatformApiPaymentHeaders(rl, access);

  const idsParam = request.nextUrl.searchParams.get("ids")?.trim();
  if (!idsParam) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "ids query parameter is required" },
      { status: 400 }
    ), access);
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^0x[a-f0-9]{64}$/.test(id));

  if (ids.length === 0) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "At least one valid questionId is required" },
      { status: 400 }
    ), access);
  }

  if (ids.length > MAX_IDS) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: `Maximum ${MAX_IDS} question IDs per request` },
      { status: 400 }
    ), access);
  }

  const endpoints = resolveSubgraphEndpoints("reality-eth");
  if (endpoints.length === 0) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Reality.eth subgraph not configured" },
      { status: 503 }
    ), access);
  }

  let questions: SubgraphQuestion[] | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: buildSubgraphRequestHeaders(endpoint),
        body: JSON.stringify({
          query: STAKE_STATS_QUERY,
          variables: { ids },
        }),
      });

      if (!response.ok) continue;

      const data = (await response.json()) as {
        data?: { questions?: SubgraphQuestion[] };
        errors?: unknown[];
      };

      if (!isGraphQlResponseSuccessful(data)) {
        serverLogger.debug(
          "Stake stats subgraph error:",
          formatGraphQlErrors(getGraphQlResponseErrors(data))
        );
        continue;
      }

      questions = data.data?.questions ?? [];
      break;
    } catch (err) {
      serverLogger.debug("Stake stats subgraph fetch failed:", err);
    }
  }

  if (questions === null) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Failed to fetch stake stats from subgraph" },
      { status: 502 }
    ), access);
  }

  const stats: Record<string, ReturnType<typeof computeListStakeSummary>> = {};

  for (const q of questions) {
    const answers = (q.answers ?? []).map((a) => ({ answer: "", bond: a.bond }));
    stats[q.id.toLowerCase()] = computeListStakeSummary({
      bounty: q.bounty ?? "0",
      leadingBond: q.last_bond ?? "0",
      answers,
    });
  }

  return withPlatformApiPaymentHeaders(NextResponse.json(
    { stats },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  ), access);
}
