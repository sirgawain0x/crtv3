"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const XMERCH_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-forms";

export type XmerchStoreEmbedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeUrl: string;
};

export function XmerchStoreEmbedModal({
  open,
  onOpenChange,
  storeUrl,
}: XmerchStoreEmbedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(85dvh,720px)] w-[min(96vw,960px)] max-w-none flex-col gap-3"
        data-testid="xmerch-store-modal"
      >
        <DialogHeader className="shrink-0 space-y-1 pr-8">
          <DialogTitle>xMerch store</DialogTitle>
          <DialogDescription className="sr-only">
            Embedded store for this creator. Press Escape to close.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            <Link
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Open in new tab
            </Link>
          </p>
        </DialogHeader>
        <iframe
          src={storeUrl}
          title="xMerch store"
          sandbox={XMERCH_IFRAME_SANDBOX}
          className="min-h-0 flex-1 w-full rounded-md border border-border bg-background"
          data-testid="xmerch-store-iframe"
        />
      </DialogContent>
    </Dialog>
  );
}
