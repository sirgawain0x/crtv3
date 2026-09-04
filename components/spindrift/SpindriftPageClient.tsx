"use client";

import Link from "next/link";
import Image from "next/image";
import { SpindriftBanner } from "@/components/spindrift/SpindriftBanner";
import { SpindriftXFollowStrip } from "@/components/spindrift/SpindriftXFollowStrip";
import type { SpindriftConfig } from "@/lib/spindrift/config";
import { SPINDRIFT_EVENTS } from "@/lib/spindrift/events";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type SpindriftPageClientProps = {
  config: SpindriftConfig;
};

export function SpindriftPageClient({ config: _config }: SpindriftPageClientProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Spindrift</span>
      </nav>

      <SpindriftBanner className="mb-6" showButton={false} />

      <section className="mb-10 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-6">
        <h2 className="text-lg font-semibold text-foreground">About Spindrift</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Spindrift is sparkling water made the hard way — with real squeezed fruit and nothing
          artificial. On Creative TV, we celebrate craft pours, mocktail culture, and the people
          who mix with intention.
        </p>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Real Fruit / Zero Artificial Shortcuts
        </p>
      </section>

      <SpindriftXFollowStrip className="mb-10" />

      <section aria-labelledby="spindrift-events-heading">
        <h2
          id="spindrift-events-heading"
          className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground"
        >
          <Trophy className="h-5 w-5 text-emerald-500" aria-hidden />
          Events
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {SPINDRIFT_EVENTS.map((event) => {
            const isActive = event.status === "active";
            const cardContent = (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  {isActive ? "Live now" : "Coming soon"}
                </span>
                {event.slug === "mixer-culture" ? (
                  <div className="mt-2">
                    <Image
                      src="/spindrift/mixer-culture/mixer-culture-title.svg"
                      alt="Mixer Culture"
                      width={320}
                      height={80}
                      className="h-auto w-[min(70%,280px)]"
                      priority
                      unoptimized
                    />
                  </div>
                ) : (
                  <span className="mt-1 block text-lg font-bold text-white">{event.title}</span>
                )}
                {event.description && (
                  <span className="mt-1 block text-sm text-emerald-100/90">{event.description}</span>
                )}
                {isActive && (
                  <span className="mt-3 inline-block rounded-md bg-gradient-to-r from-emerald-500 to-teal-400 px-3 py-1.5 text-sm font-semibold text-white">
                    Enter event
                  </span>
                )}
              </>
            );

            if (isActive) {
              return (
                <li key={event.slug}>
                  <Link
                    href={event.href}
                    className={cn(
                      "group relative block min-h-[220px] overflow-hidden rounded-xl border border-emerald-500/30 p-6",
                      "transition hover:border-emerald-400/50 hover:shadow-md",
                    )}
                  >
                    <div className="absolute inset-0 -z-10" aria-hidden>
                      <Image
                        src="/spindrift/mixer-culture/mixer-culture-background.svg"
                        alt=""
                        fill
                        className="object-cover object-center opacity-70 transition duration-500 group-hover:opacity-85"
                        sizes="(max-width: 640px) 100vw, 50vw"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-950/60 to-stone-950/80" />
                    </div>
                    {cardContent}
                  </Link>
                </li>
              );
            }

            return (
              <li key={event.slug}>
                <div
                  className="block cursor-not-allowed rounded-xl border border-emerald-500/15 bg-emerald-50 p-6 opacity-80 dark:bg-emerald-950/30"
                  aria-disabled="true"
                >
                  {cardContent}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
