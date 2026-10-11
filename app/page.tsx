import type { Metadata } from "next";
import { HERO_DESCRIPTION } from "@/context/context";
import NonLoggedInView from "@/components/home-page/NonLoggedInView";

export const metadata: Metadata = {
  description: HERO_DESCRIPTION,
  openGraph: {
    title: "Creative TV",
    description: HERO_DESCRIPTION,
    siteName: "Creative TV",
    url: "https://tv.creativeplatform.xyz",
    images: [
      {
        url: "/images/Creative_TV_Logo.png",
        width: 500,
        height: 500,
        alt: "Creative TV Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creative TV",
    description: HERO_DESCRIPTION,
    images: ["/Creative_TV.png"],
  },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <NonLoggedInView />
    </main>
  );
}
