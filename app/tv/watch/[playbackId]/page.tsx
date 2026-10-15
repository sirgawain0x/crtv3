import { TVWatchClient } from "@/components/tv/TVWatchClient";

type PageProps = {
  params: Promise<{ playbackId: string }>;
};

export default async function TVWatchPage({ params }: PageProps) {
  const { playbackId } = await params;
  return <TVWatchClient playbackId={playbackId} />;
}
