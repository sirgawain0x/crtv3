import { MixerCulturePageClient } from "@/components/spindrift/mixer-culture/MixerCulturePageClient";
import { getMixerCultureConfig } from "@/lib/spindrift/config";
import { resolveSongchainConfig } from "@/lib/songchain/resolve-lens-app";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const MIXER_CULTURE_OG_IMAGE = {
  url: "/spindrift/mixer-culture/mixer-culture-og.png",
  width: 1200,
  height: 630,
  alt: "Spindrift Mixer Culture — Grapeade mocktail pours on Creative TV",
  type: "image/png",
} as const;

export const metadata: Metadata = {
  title: "Mixer Culture | Spindrift | Creative TV",
  description:
    "Spindrift Mixer Culture — share your Grapeade mocktail pour. Real fruit, zero artificial shortcuts. Grand Feature + Verified Badge for top pours.",
  openGraph: {
    title: "Mixer Culture | Spindrift | Creative TV",
    description:
      "Share your Grapeade mocktail pour. Real fruit, zero artificial shortcuts.",
    type: "website",
    url: "/spindrift/mixer-culture",
    images: [MIXER_CULTURE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mixer Culture | Spindrift | Creative TV",
    description:
      "Share your Grapeade mocktail pour. Real fruit, zero artificial shortcuts.",
    images: [MIXER_CULTURE_OG_IMAGE.url],
  },
};

export default async function MixerCulturePage() {
  const config = await resolveSongchainConfig(getMixerCultureConfig());
  return <MixerCulturePageClient config={config} />;
}
