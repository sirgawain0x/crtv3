"use client";

import { useState } from "react";
import { Film, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MixerCultureSubmitPanelProps = {
  className?: string;
};

export function MixerCultureSubmitPanel({ className }: MixerCultureSubmitPanelProps) {
  const [recipe, setRecipe] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!recipe.trim()) {
      toast.error("Add your Grapeade mocktail recipe before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: wire mixer-culture submission backend (photo/video upload + recipe storage)
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.info(
        "Submissions open soon — upload your pour on Creative TV and check back to enter.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-card/40 p-5",
        className,
      )}
    >
      <div>
        <h3 className="text-lg font-semibold text-foreground">Submit your Grapeade pour</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Share a photo or short video of your Grapeade mocktail with the recipe. Keep Spindrift
          visible in the frame.
        </p>
        <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Real Fruit / Zero Artificial Shortcuts
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <Upload className="mx-auto mb-2 h-8 w-8 text-emerald-600/70" aria-hidden />
        <p className="text-sm font-medium text-foreground">Photo or short video</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {/* TODO: integrate Creative TV media picker when submission API is live */}
          Upload on Creative TV, then select your pour here once submissions are wired.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="mixer-culture-recipe" className="text-sm font-medium">
          Your Grapeade mocktail recipe
        </label>
        <Textarea
          id="mixer-culture-recipe"
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
          placeholder="e.g. 4 oz Spindrift Grapeade, 2 oz fresh grapefruit juice, muddled mint, ice…"
          rows={4}
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
        <Film className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        <p>
          Top pours earn a <strong className="text-foreground">Grand Feature on Creative TV</strong>{" "}
          and a <strong className="text-foreground">Verified Badge</strong>.
        </p>
      </div>

      <Button
        onClick={() => void handleSubmit()}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? "Submitting…" : "Submit pour"}
      </Button>
    </div>
  );
}
