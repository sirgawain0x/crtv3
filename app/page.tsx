import type { Metadata } from "next";
import { HERO_DESCRIPTION } from "@/context/context";
import NonLoggedInView from "@/components/home-page/NonLoggedInView";

export const metadata: Metadata = {
  description: HERO_DESCRIPTION,
  openGraph: {
    description: HERO_DESCRIPTION,
  },
  twitter: {
    description: HERO_DESCRIPTION,
  },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <NonLoggedInView />
    </main>
  );
}
