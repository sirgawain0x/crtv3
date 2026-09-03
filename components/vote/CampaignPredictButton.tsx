"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { CreatePrediction, type PredictionPreset } from "@/components/predictions/CreatePrediction";
import { usePredictionAccess } from "@/lib/hooks/predictions/usePredictionAccess";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import type { PredictionCategoryValue } from "@/lib/predictions/categories";

export interface CampaignResults {
  campaignId: string;
  title: string;
  state: string;
  choices: string[];
  scores: number[];
  totalVotingPower: number;
  totalVotes: number;
  leadingChoice: string | null;
  end: number;
}

interface CampaignPredictButtonProps {
  campaignId: string;
  campaignTitle: string;
  onCreated?: () => void;
  className?: string;
}

function shortCampaignTitle(title?: string | null): string {
  if (!title) return "this campaign";
  const clean = title.trim();
  if (!clean) return "this campaign";
  if (clean.length <= 40) return clean;
  return `${clean.slice(0, 37).trim()}...`;
}

/**
 * Build campaign-flavored prediction presets from live Snapshot results.
 * Seeds are resolved against /api/campaigns/[id]/results at tap-time so the
 * leading choice / totals are current when the user picks one.
 */
function buildCampaignPresets(
  campaignTitle: string,
  results: CampaignResults | null
): PredictionPreset[] {
  const title = shortCampaignTitle(campaignTitle);
  const leading = results?.leadingChoice ?? "the leading choice";
  const totalVotes = results?.totalVotes ?? 0;

  return [
    {
      id: "yes-wins",
      label: "Yes will win",
      type: "bool",
      makeTitle: () => `Will "${title}" pass with a Yes majority?`,
      closeDays: 14,
      category: "general",
      description:
        "Resolves Yes if the winning choice has more voting power than every other choice when voting closes.",
    },
    {
      id: "leading-choice-wins",
      label: `${leading} wins`,
      type: "bool",
      makeTitle: () => `Will "${leading}" be the winning choice in "${title}"?`,
      closeDays: 14,
      category: "general",
      description: `Resolves Yes if "${leading}" ends with the highest voting power when voting closes.`,
    },
    {
      id: "high-turnout",
      label: `${Math.max(10, totalVotes + 5)}+ total votes`,
      type: "bool",
      makeTitle: () =>
        `Will "${title}" reach ${Math.max(10, totalVotes + 5)} total votes?`,
      closeDays: 21,
      category: "general",
      description:
        "Resolves Yes if the campaign's total vote count reaches the target when voting closes.",
    },
  ];
}

/**
 * Predict button for the campaign vote page action row, mirroring
 * VideoPredictButton / CreatorPredictButton.
 *
 * NOTE: campaign predictions are NOT linked to the campaign — the link
 * registry (prediction_video_links) is video-only today. Markets land in
 * the general /predict list. See open follow-up in the crtv3 skill.
 */
export function CampaignPredictButton({
  campaignId,
  campaignTitle,
  onCreated,
  className = "",
}: CampaignPredictButtonProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CampaignResults | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const router = useRouter();
  const { isConnected } = useWalletStatus();
  const { canCreatePrediction, blockReason, isLoading } = usePredictionAccess();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setResultsError(null);
    fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/results`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<CampaignResults>;
      })
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) setResultsError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId]);

  const handleCreated = () => {
    onCreated?.();
    router.refresh();
  };

  const disabled = !isConnected || isLoading || !canCreatePrediction;
  const blocked = !isLoading && !canCreatePrediction && Boolean(blockReason);

  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-2 hover:scale-105 transition-transform ${className}`}
      disabled={disabled}
      onClick={() => setOpen(true)}
      aria-label="Create a prediction about this campaign"
    >
      <TrendingUp className="h-4 w-4" />
      <span className="text-sm font-medium">Predict</span>
    </Button>
  );

  return (
    <>
      <TooltipProvider delayDuration={100}>
        {blocked ? (
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>{blockReason}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Prediction</DialogTitle>
            <DialogDescription>
              {campaignTitle
                ? `Make a prediction about the "${campaignTitle}" campaign's outcome.`
                : "Make a prediction about this campaign."}
            </DialogDescription>
          </DialogHeader>
          {resultsError && (
            <p className="text-xs text-destructive">
              Could not load live results for presets: {resultsError}
            </p>
          )}
          <CreatePrediction
            embedded
            defaultCategory={"general" as PredictionCategoryValue}
            successHref={`/vote/${campaignId}`}
            onCreated={handleCreated}
            showPresets
            presets={buildCampaignPresets(campaignTitle, results)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
