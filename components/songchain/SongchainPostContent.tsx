"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { linkifyPostText } from "@/lib/utils/linkify-post-text";
import { CreativeTVLinkPreview } from "@/components/songchain/CreativeTVLinkPreview";
import { ExternalLinkPreview } from "@/components/songchain/ExternalLinkPreview";
import { cn } from "@/lib/utils/utils";

type SongchainPostContentProps = {
  text: string;
  compact?: boolean;
  className?: string;
};

export function SongchainPostContent({
  text,
  compact = false,
  className,
}: SongchainPostContentProps) {
  const segments = useMemo(() => linkifyPostText(text), [text]);

  const uniqueInternalUrls = useMemo(() => {
    const urls = segments
      .filter((segment) => segment.type === "internal")
      .map((segment) => segment.value);
    return Array.from(new Set(urls));
  }, [segments]);

  const uniqueExternalUrls = useMemo(() => {
    const urls = segments
      .filter((segment) => segment.type === "external")
      .map((segment) => segment.value);
    return Array.from(new Set(urls));
  }, [segments]);

  if (!text) return null;

  return (
    <div className={cn("space-y-2", className)}>
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

      {!compact &&
        uniqueInternalUrls.map((url) => (
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
