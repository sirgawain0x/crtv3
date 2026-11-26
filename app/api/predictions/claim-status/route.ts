import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from "next/server";
import { isAddress, createPublicClient, http, fallback } from "viem";
import { base } from "@account-kit/infra";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import {
  getFinalAnswer,
  getQuestion,
} from "@/lib/sdk/reality-eth/reality-eth-question-wrapper";
import { enrichPredictionDisplaySync } from "@/lib/predictions/enrich-prediction-display";
import { getUserClaimStatus } from "@/lib/predictions/claim-status";
import { getAlchemyApiKey } from "@/lib/web3/alchemy-key";

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "predictions.claim-status" });
  if (!access.allowed) return access.response;

  const rl = await rateLimiters.generous(request);
  if (rl) return withPlatformApiPaymentHeaders(rl, access);

  const questionId = request.nextUrl.searchParams.get("questionId")?.trim();
  const address = request.nextUrl.searchParams.get("address")?.trim();
  const smartAccount = request.nextUrl.searchParams
    .get("smartAccount")
    ?.trim();

  if (!questionId || !/^0x[a-fA-F0-9]{64}$/.test(questionId)) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Valid questionId is required" },
      { status: 400 }
    ), access);
  }

  if (!address || !isAddress(address)) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Valid address is required" },
      { status: 400 }
    ), access);
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: fallback([
      http(
        getAlchemyApiKey()
          ? `https://base-mainnet.g.alchemy.com/v2/${getAlchemyApiKey()}`
          : undefined
      ),
      http("https://mainnet.base.org"),
    ]),
  });

  try {
    const [questionData, finalAnswer] = await Promise.all([
      getQuestion(publicClient, questionId),
      getFinalAnswer(publicClient, questionId).catch(() => null),
    ]);

    const { parsed } = enrichPredictionDisplaySync(
      questionData.question ?? "",
      questionData.template_id
    );

    const result = await getUserClaimStatus({
      publicClient,
      questionId,
      addresses: [address, smartAccount],
      finalAnswer,
      parsed,
    });

    return withPlatformApiPaymentHeaders(NextResponse.json({
      status: result.status,
      winningAnswerLabel: result.winningAnswerLabel,
      winningBondTotal: result.winningBondTotal.toString(),
      contractBalance: result.contractBalance.toString(),
    }), access);
  } catch (e) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to check claim status" },
      { status: 500 }
    ), access);
  }
}
