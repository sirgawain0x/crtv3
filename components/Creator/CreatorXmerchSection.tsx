"use client";

import { useState } from "react";
import {
  featuredProductLabel,
  getPublicXmerchProfile,
} from "@/lib/creator/xmerch-profile";
import type { XmerchProductPreview } from "@/lib/creator/xmerch-product-preview";
import { XmerchStoreEmbedModal } from "@/components/Creator/XmerchStoreEmbedModal";

export type CreatorXmerchSectionProps = {
  xmerchStored?: unknown;
  productPreviews?: Record<string, XmerchProductPreview>;
  className?: string;
};

const storeButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted";

const featuredCardClassName =
  "group flex w-[calc(50%-0.25rem)] max-w-[9rem] flex-col overflow-hidden rounded-lg border border-border bg-background text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/30 sm:w-36";

function XmerchMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- branded profile icon
    <img
      src="/icons/xmerch-icon-32.png"
      alt=""
      width={32}
      height={32}
      className={className}
      aria-hidden
    />
  );
}

function FeaturedProductCard({
  url,
  preview,
  onOpen,
}: {
  url: string;
  preview?: XmerchProductPreview;
  onOpen: (url: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const title = preview?.title ?? featuredProductLabel(url);
  const imageUrl = preview?.imageUrl;
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <li className="min-w-0">
      <button
        type="button"
        className={featuredCardClassName}
        onClick={() => onOpen(url)}
        data-testid="xmerch-featured-product"
      >
        <div className="relative aspect-square w-full bg-muted/40">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- xMerch OG image
            <img
              src={imageUrl!}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3">
              <XmerchMark className="h-8 w-8 rounded-sm opacity-90" />
            </div>
          )}
        </div>
        <span className="line-clamp-2 px-2 py-1.5 text-xs font-medium leading-snug text-foreground">
          {title}
        </span>
      </button>
    </li>
  );
}

export function CreatorXmerchSection({
  xmerchStored,
  productPreviews,
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
  const showFeatured = hasFeatured;
  const showStore = Boolean(xmerch.storeUrl) && !showFeatured;

  return (
    <div className={className} data-testid="creator-xmerch-section">
      {showStore ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="xMerch store"
            className={storeButtonClassName}
            data-testid="xmerch-store-trigger"
            onClick={() => openModal(xmerch.storeUrl!)}
          >
            <XmerchMark className="h-4 w-4 rounded-sm" />
          </button>
        </div>
      ) : null}
      {showFeatured ? (
        <ul
          className="flex max-w-md flex-wrap gap-2"
          aria-label="Featured xMerch products"
          data-testid="xmerch-featured-products"
        >
          {xmerch.featuredProductUrls.map((url) => (
            <FeaturedProductCard
              key={url}
              url={url}
              preview={productPreviews?.[url]}
              onOpen={openModal}
            />
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
