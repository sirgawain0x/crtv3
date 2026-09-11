import { SpindriftPageClient } from "@/components/spindrift/SpindriftPageClient";
import { getSpindriftConfig } from "@/lib/spindrift/config";
import { resolveSongchainConfig } from "@/lib/songchain/resolve-lens-app";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SPINDRIFT_HUB_OG_IMAGE = {
  url: "/spindrift/hero-pour.png",
  width: 1920,
  height: 1080,
  alt: "Grapeade pour — Mixer Culture on Creative TV",
  type: "image/png",
} as const;

export const metadata: Metadata = {
  title: "Spindrift | Creative TV",
  description:
    "Spindrift on Creative TV — real fruit sparkling water, made the hard way. Community pours, recipes, and events.",
  openGraph: {
    title: "Spindrift | Creative TV",
    description:
      "Spindrift on Creative TV — real fruit sparkling water, made the hard way. Community pours, recipes, and events.",
    type: "website",
    url: "/spindrift",
    images: [SPINDRIFT_HUB_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spindrift | Creative TV",
    description:
      "Spindrift on Creative TV — real fruit sparkling water, made the hard way. Community pours, recipes, and events.",
    images: [SPINDRIFT_HUB_OG_IMAGE.url],
  },
};

export default async function SpindriftPage() {
  const config = await resolveSongchainConfig(getSpindriftConfig());
  return <SpindriftPageClient config={config} />;
}
