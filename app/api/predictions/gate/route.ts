import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { evaluatePredictionDraft } from "@/lib/decision-models/prediction-gate";

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
});

/**
 * POST /api/predictions/gate
 *
 * Decision-model quality/structure check for a prediction draft.
 * Never resolves markets or picks winning outcomes.
 * TypeSafe Jev review (when configured) is free — abuse is handled by
 * BotID, rate limits, and prediction quotas, not per-call USDC.
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

  const decision = await evaluatePredictionDraft(parsed.data);

  return NextResponse.json({
    success: true,
    decision,
  });
}
