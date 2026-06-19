"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { linkifyPostText } from "@/lib/utils/linkify-post-text";
import { CreativeTVLinkPreview } from "@/components/songchain/CreativeTVLinkPreview";
import { ExternalLinkPreview } from "@/components/songchain/ExternalLinkPreview";
import { shouldSkipLinkPreview } from "@/lib/songchain/post-utils";
import { cn } from "@/lib/utils/utils";

type SongchainPostContentProps = {
  text: string;
  compact?: boolean;
  className?: string;
  embeddedCreativeTVUrls?: Set<string>;
  skipAllInternalPreviews?: boolean;
};

export function SongchainPostContent({
  text,
  compact = false,
  className,
  embeddedCreativeTVUrls,
  skipAllInternalPreviews = false,
}: SongchainPostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const segments = useMemo(() => linkifyPostText(text), [text]);

  const uniqueInternalUrls = useMemo(() => {
    const urls = segments
      .filter((segment) => segment.type === "internal")
      .map((segment) => segment.value);
    return Array.from(new Set(urls));
  }, [segments]);

  const internalUrlsForPreview = useMemo(() => {
    if (compact) return [];
    const embedded = embeddedCreativeTVUrls ?? new Set<string>();
    return uniqueInternalUrls.filter(
      (url) => !shouldSkipLinkPreview(url, embedded, skipAllInternalPreviews),
    );
  }, [
    compact,
    uniqueInternalUrls,
    embeddedCreativeTVUrls,
    skipAllInternalPreviews,
  ]);

  const uniqueExternalUrls = useMemo(() => {
    const urls = segments
      .filter((segment) => segment.type === "external")
      .map((segment) => segment.value);
    return Array.from(new Set(urls));
  }, [segments]);

  if (!text) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("relative", !isExpanded && "line-clamp-3")}>
        <p
          className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            compact && "text-xs",
          )}
        >
          {segments.map((segment, index) => {
            if (segment.type === "text") {
              return <span key={`text-${index}`}>{segment.value}</span>;
            }

            if (segment.type === "internal") {
              return (
                <Link
                  key={`internal-${index}`}
                  href={segment.href}
                  className="break-all text-violet-400 hover:text-violet-300 hover:underline"
                >
                  {segment.value}
                </Link>
              );
            }

            return (
              <a
                key={`external-${index}`}
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-violet-400 hover:text-violet-300 hover:underline"
              >
                {segment.value}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            );
          })}
        </p>

        {isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
            aria-label="Collapse post text"
          >
            Show less
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
          aria-label="Expand post text"
        >
          Show more
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}

      {internalUrlsForPreview.map((url) => (
        <CreativeTVLinkPreview key={`preview-internal-${url}`} url={url} />
      ))}

      {!compact &&
        uniqueExternalUrls.map((url) => (
          <ExternalLinkPreview
            key={`preview-external-${url}`}
            url={url}
            previewOnly
          />
        ))}
    </div>
  );
}
