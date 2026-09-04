import { SpindriftPageClient } from "@/components/spindrift/SpindriftPageClient";
import { getSpindriftConfig } from "@/lib/spindrift/config";
import { resolveSongchainConfig } from "@/lib/songchain/resolve-lens-app";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spindrift | Creative TV",
  description:
    "Spindrift on Creative TV — real fruit sparkling water, made the hard way. Community pours, recipes, and events.",
};

export default async function SpindriftPage() {
  const config = await resolveSongchainConfig(getSpindriftConfig());
  return <SpindriftPageClient config={config} />;
}
