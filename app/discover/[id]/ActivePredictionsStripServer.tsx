import { ActivePredictionsStrip, type PredictionStripItem } from "@/components/Videos/ActivePredictionsStrip";

interface ActivePredictionsStripServerProps {
  videoAssetId: string;
}

export async function ActivePredictionsStripServer({
  videoAssetId,
}: ActivePredictionsStripServerProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const linkedPredictions: PredictionStripItem[] = await fetch(
    `${baseUrl}/api/predictions/by-video?videoAssetId=${encodeURIComponent(videoAssetId)}`,
    { next: { revalidate: 30 } }
  )
    .then((res) => (res.ok ? res.json() : { predictions: [] }))
    .then((json) => json.predictions ?? [])
    .catch(() => []);

  return (
    <ActivePredictionsStrip
      videoAssetId={videoAssetId}
      linkedPredictions={linkedPredictions}
    />
  );
}
