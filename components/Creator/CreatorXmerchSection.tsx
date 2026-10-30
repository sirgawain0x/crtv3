"use client";

import { useState } from "react";
import {
  featuredProductLabel,
  sanitizeStoredXmerchProfile,
  type CreatorXmerchProfile,
} from "@/lib/creator/xmerch-profile";
import { XmerchStoreEmbedModal } from "@/components/Creator/XmerchStoreEmbedModal";
import { CreatorSocialLinks } from "@/components/Creator/CreatorSocialLinks";

export type CreatorXmerchSectionProps = {
  socialOrbUrl?: string | null;
  socialInstagramUrl?: string | null;
  socialXUrl?: string | null;
  xmerchStored?: unknown;
  className?: string;
};

const chipClassName =
  "inline-flex max-w-full items-center rounded-md border border-border bg-muted/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted";

export function CreatorXmerchSection({
  socialOrbUrl,
  socialInstagramUrl,
  socialXUrl,
  xmerchStored,
  className,
}: CreatorXmerchSectionProps) {
  const xmerch = sanitizeStoredXmerchProfile(xmerchStored);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  const openModal = (url: string) => {
    setActiveUrl(url);
    setModalOpen(true);
  };

  const hasFeatured = xmerch.featuredProductUrls.length > 0;
  const hasOtherSocial =
    socialOrbUrl || socialInstagramUrl || socialXUrl || xmerch.storeUrl;

  if (!hasOtherSocial && !hasFeatured) {
    return null;
  }

  return (
    <div className={className} data-testid="creator-xmerch-section">
      <CreatorSocialLinks
        socialOrbUrl={socialOrbUrl}
        socialInstagramUrl={socialInstagramUrl}
        socialXUrl={socialXUrl}
        xmerchProfile={xmerch}
        onOpenXmerch={openModal}
      />
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
