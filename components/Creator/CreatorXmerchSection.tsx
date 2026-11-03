"use client";

import { useState } from "react";
import {
  featuredProductLabel,
  getPublicXmerchProfile,
} from "@/lib/creator/xmerch-profile";
import { XmerchStoreEmbedModal } from "@/components/Creator/XmerchStoreEmbedModal";

export type CreatorXmerchSectionProps = {
  xmerchStored?: unknown;
  className?: string;
};

const iconButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted";

const chipClassName =
  "inline-flex max-w-full items-center rounded-md border border-border bg-muted/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted";

function XmerchMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- branded profile icon
    <img
      src="/icons/xmerch-icon-32.png"
      alt=""
      width={16}
      height={16}
      className={className}
      aria-hidden
    />
  );
}

export function CreatorXmerchSection({
  xmerchStored,
  className,
}: CreatorXmerchSectionProps) {
  const xmerch = getPublicXmerchProfile(xmerchStored);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  if (!xmerch) {
    return null;
  }

  const openModal = (url: string) => {
    setActiveUrl(url);
    setModalOpen(true);
  };

  const hasFeatured = xmerch.featuredProductUrls.length > 0;

  return (
    <div className={className} data-testid="creator-xmerch-section">
      {xmerch.storeUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="xMerch store"
            className={iconButtonClassName}
            data-testid="xmerch-store-trigger"
            onClick={() => openModal(xmerch.storeUrl!)}
          >
            <XmerchMark className="h-4 w-4 rounded-sm" />
          </button>
        </div>
      ) : null}
      {hasFeatured ? (
        <ul
          className="mt-3 flex flex-wrap gap-2"
          aria-label="Featured xMerch products"
          data-testid="xmerch-featured-products"
        >
          {xmerch.featuredProductUrls.map((url) => (
            <li key={url}>
              <button
                type="button"
                className={chipClassName}
                onClick={() => openModal(url)}
                data-testid="xmerch-featured-product"
              >
                <span className="truncate">{featuredProductLabel(url)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {activeUrl ? (
        <XmerchStoreEmbedModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          storeUrl={activeUrl}
        />
      ) : null}
    </div>
  );
}
