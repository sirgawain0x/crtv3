"use client";

import Link from "next/link";
import Image from "next/image";
import { BRAND_CHANNELS } from "@/lib/channels/brand-channels";

const BRAND_IMAGES: Partial<Record<string, string>> = {
  spindrift: "/spindrift/spindrift-logo.svg",
  chones: "/chones/chonesbannerblackyellowlogo.svg",
};

export function TVHomeRails() {
  return (
    <section aria-labelledby="tv-brand-rails-heading" className="mb-10">
      <h2 id="tv-brand-rails-heading" className="mb-4">Featured Channels</h2>
      <div className="tv-rail">
        {BRAND_CHANNELS.map((channel) => (
          <Link
            key={channel.slug}
            href={`/tv/channel/${channel.slug}`}
            className="tv-rail-item tv-card tv-focusable block p-6"
          >
            <div className="flex h-28 items-center justify-center">
              {BRAND_IMAGES[channel.slug] ? (
                <Image
                  src={BRAND_IMAGES[channel.slug]!}
                  alt={channel.name}
                  width={180}
                  height={72}
                  className="max-h-16 w-auto object-contain"
                />
              ) : (
                <span className="text-2xl font-semibold">{channel.name}</span>
              )}
            </div>
            <p className="mt-3 text-center text-lg text-white/80">{channel.name}</p>
          </Link>
        ))}
        <Link
          href="/tv/discover"
          className="tv-rail-item tv-card tv-focusable flex items-center justify-center p-6 text-xl font-semibold"
        >
          Browse All
        </Link>
      </div>
    </section>
  );
}
