import { NextRequest, NextResponse } from "next/server";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { supabaseService } from "@/lib/sdk/supabase/service";

/**
 * GET /api/predictions/by-video?videoAssetId=<Livepeer asset UUID>
 *
 * Returns the prediction markets linked to a video, newest first, for the
 * video-page ActivePredictionsStrip. Anonymous access is allowed (RLS is
 * public-read), so this only exposes question IDs plus any stored display
 * metadata (title/category/questionType/outcomes) from
 * prediction_market_creations — no addresses beyond the creator wallet, which
 * is public on-chain data anyway.
 *
 * Response:
 * {
 *   videoAssetId: "<normalized>",
 *   predictions: [
 *     { questionId, title, category, questionType, outcomes, createdAt }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.generous(request);
  if (rl) return rl;

  const raw = request.nextUrl.searchParams.get("videoAssetId")?.trim() ?? "";
  // Accept the Livepeer asset UUID used by /discover/[id] pages.
  if (!isUuid(raw)) {
    return NextResponse.json(
      { error: "Valid videoAssetId (Livepeer asset UUID) query parameter is required" },
      { status: 400 }
    );
  }
  const videoAssetId = raw.toLowerCase();

  if (!supabaseService) {
    return NextResponse.json({ videoAssetId, predictions: [] });
  }

  // Resolve Livepeer UUID -> internal video_assets PK.
  const { data: videoRow, error: videoLookupError } = await supabaseService
    .from("video_assets")
    .select("id")
    .eq("asset_id", videoAssetId)
    .maybeSingle();

  if (videoLookupError) {
    return NextResponse.json(
      { error: videoLookupError.message },
      { status: 500 }
    );
  }

  if (!videoRow) {
    return NextResponse.json({ videoAssetId, predictions: [] });
  }

  const { data: links, error: linksError } = await supabaseService
    .from("prediction_video_links")
    .select("question_id, created_at")
    .eq("video_asset_id", videoRow.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (linksError) {
    return NextResponse.json(
      { error: linksError.message },
      { status: 500 }
    );
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ videoAssetId, predictions: [] });
  }

  const questionIds = links.map((l) => l.question_id);
  const createdAtByQuestion = new Map(
    links.map((l) => [l.question_id, l.created_at] as const)
  );

  // Best-effort display metadata for cards before subgraph hydration.
  const { data: metadataRows, error: metadataError } = await supabaseService
    .from("prediction_market_creations")
    .select("question_id, title, category, question_type, outcomes")
    .in("question_id", questionIds);

  if (metadataError) {
    // Metadata is optional enrichment; surface the IDs even if this leg fails.
    return NextResponse.json({
      videoAssetId,
      predictions: links.map((l) => ({
        questionId: l.question_id,
        title: null,
        category: null,
        questionType: null,
        outcomes: null,
        createdAt: l.created_at,
      })),
    });
  }

  const metadataByQuestion = new Map(
    (metadataRows ?? []).map((row) => [row.question_id, row] as const)
  );

  const predictions = questionIds.map((questionId) => {
    const meta = metadataByQuestion.get(questionId);
    return {
      questionId,
      title: meta?.title ?? null,
      category: meta?.category ?? null,
      questionType: meta?.question_type ?? null,
      outcomes: Array.isArray(meta?.outcomes) ? (meta!.outcomes as string[]) : null,
      createdAt: createdAtByQuestion.get(questionId) ?? null,
    };
  });

  return NextResponse.json({ videoAssetId, predictions });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}