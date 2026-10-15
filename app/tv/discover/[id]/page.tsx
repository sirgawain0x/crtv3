import { TVDiscoverClient } from "@/components/tv/TVDiscoverClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TVDiscoverVideoPage({ params }: PageProps) {
  const { id } = await params;
  return <TVDiscoverClient assetId={id} />;
}
