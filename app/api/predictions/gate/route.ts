import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { evaluatePredictionDraft } from "@/lib/decision-models/prediction-gate";
import { isDecisionModelConfigured } from "@/lib/decision-models/config";
import {
  DECISION_GATE_PAYMENT_MAX_AGE_MS,
  DECISION_GATE_RECIPIENT,
  PREDICTION_GATE_PRICE,
  paymentRequiredBody,
} from "@/lib/decision-models/billing";
import { verifyUsdcPaymentProof } from "@/lib/payments/verify-usdc-payment";

const bodySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  questionType: z
    .enum(["bool", "uint", "single-select", "multiple-select"])
    .optional(),
  outcomes: z.array(z.string().max(200)).max(32).optional(),
  category: z.string().max(64).optional(),
  closeDate: z.string().max(32).optional(),
  closeTime: z.string().max(32).optional(),
  paymentProof: z
    .object({
      transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      amount: z.string().min(1),
    })
    .optional(),
});

/**
 * POST /api/predictions/gate
 *
 * Decision-model quality/structure check for a prediction draft.
 * Never resolves markets or picks winning outcomes.
 * When TypeSafe Jev is configured, requires x402 USDC payment proof.
 */
export async function POST(request: NextRequest) {
  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (isDecisionModelConfigured()) {
    const proof = parsed.data.paymentProof;
    if (!proof?.transactionHash || !proof?.amount) {
      return NextResponse.json(paymentRequiredBody("prediction-gate"), {
        status: 402,
      });
    }
    const paymentVerification = await verifyUsdcPaymentProof({
      transactionHash: proof.transactionHash,
      amount: proof.amount,
      recipient: DECISION_GATE_RECIPIENT,
      requiredAmount: PREDICTION_GATE_PRICE,
      maxAgeMs: DECISION_GATE_PAYMENT_MAX_AGE_MS,
      logLabel: "PredictionGate",
    });
    if (!paymentVerification.valid) {
      return NextResponse.json(
        { error: paymentVerification.error ?? "Invalid payment proof" },
        { status: 402 }
      );
    }
  }

  const { paymentProof: _paymentProof, ...draft } = parsed.data;
  const decision = await evaluatePredictionDraft(draft);

  return NextResponse.json({
    success: true,
    decision,
  });
}
