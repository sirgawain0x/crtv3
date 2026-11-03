"use client";

import { Button } from "@/components/ui/button";
import type { MembershipDetails } from "@/lib/hooks/unlock/useMembershipVerification";
import { getPassDisplayName } from "@/lib/access/membership-labels";
import { formatPassExpirationDate } from "@/lib/access/format-pass-expiration";
import { CancelMembershipButton } from "./CancelMembershipButton";

const LIFETIME_EXPIRATION_THRESHOLD = 32503680000;

export interface MembershipPassRowsProps {
  passes: MembershipDetails[];
  onRenewScroll?: () => void;
  onCancelSuccess?: () => void | Promise<void>;
}

export function MembershipPassRows({
  passes,
  onRenewScroll,
  onCancelSuccess,
}: MembershipPassRowsProps) {
  return (
    <div className="space-y-4" data-testid="membership-pass-rows">
      {passes.map((pass) => (
        <div
          key={`${pass.address}-${pass.tokenId ?? "unknown"}`}
          className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between p-4 sm:p-6 border rounded-xl bg-card"
          data-testid="membership-pass-row"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-lg">{getPassDisplayName(pass.address)}</p>
              <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-500">
                Active
              </span>
            </div>
            {pass.expiration && pass.expiration < LIFETIME_EXPIRATION_THRESHOLD ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Expires on {formatPassExpirationDate(pass.expiration)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const now = Date.now();
                    const exp = pass.expiration! * 1000;
                    const diff = exp - now;
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if (days < 0) return "Expired";
                    if (days === 0) return "Expires today";
                    return `${days} day${days === 1 ? "" : "s"} remaining`;
                  })()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Lifetime / Never expires</p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {onRenewScroll ? (
              <Button variant="outline" onClick={onRenewScroll}>
                Buy again
              </Button>
            ) : null}
            {pass.expiration && pass.expiration < LIFETIME_EXPIRATION_THRESHOLD ? (
              <CancelMembershipButton
                expiration={pass.expiration}
                onSuccess={onCancelSuccess}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
