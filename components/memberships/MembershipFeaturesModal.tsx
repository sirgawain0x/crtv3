"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEMBERSHIP_TIERS } from "@/lib/access/membership-tiers";
import { MembershipIcon } from "./MembershipIcon";

type MembershipFeaturesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTierIndex?: number;
};

export function MembershipFeaturesModal({
  open,
  onOpenChange,
  defaultTierIndex = 0,
}: MembershipFeaturesModalProps) {
  const [activeTier, setActiveTier] = useState(defaultTierIndex);

  useEffect(() => {
    if (open) {
      setActiveTier(defaultTierIndex);
    }
  }, [open, defaultTierIndex]);

  const tier = MEMBERSHIP_TIERS[activeTier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Membership Tiers &amp; Features</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MEMBERSHIP_TIERS.map((t, index) => (
              <button
                key={t.address}
                type="button"
                onClick={() => setActiveTier(index)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  index === activeTier
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.name.replace("Creative ", "")}
              </button>
            ))}
          </div>

          {tier && (
            <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/50 p-5">
              <div className="mb-1 flex items-center gap-2">
                <MembershipIcon name="star" className="text-primary" />
                <h3 className="text-lg font-bold">{tier.name}</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {tier.priceLabel}
              </p>
              <ul className="space-y-2.5">
                {tier.detailedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start text-sm">
                    <MembershipIcon
                      name="check"
                      className="mr-2 mt-0.5 flex-shrink-0 text-primary"
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
