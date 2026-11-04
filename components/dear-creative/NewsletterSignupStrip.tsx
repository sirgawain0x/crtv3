import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_BODY,
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_BUTTON,
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_HEADLINE,
  DEAR_CREATIVE_NEWSLETTER_SIGNUP_URL,
} from "@/lib/dear-creative/newsletter-signup-copy";
import { cn } from "@/lib/utils";

export type NewsletterSignupStripVariant = "full-width" | "compact";

export type NewsletterSignupStripProps = {
  variant?: NewsletterSignupStripVariant;
  className?: string;
};

const headlineId = "dear-creative-newsletter-signup-headline";
const bodyId = "dear-creative-newsletter-signup-body";

export function NewsletterSignupStrip({
  variant = "full-width",
  className,
}: NewsletterSignupStripProps) {
  const isCompact = variant === "compact";

  return (
    <section
      data-testid={`newsletter-signup-strip-${variant}`}
      data-variant={variant}
      aria-labelledby={headlineId}
      aria-describedby={bodyId}
      className={cn(
        isCompact
          ? "flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          : "w-full border-y border-border/60 bg-muted/20",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
          !isCompact &&
            "mx-auto w-full max-w-7xl flex-col px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Mail
            className={cn(
              "mt-0.5 shrink-0 text-primary",
              isCompact ? "h-4 w-4" : "h-5 w-5",
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <h2
              id={headlineId}
              className={cn(
                "font-semibold text-foreground",
                isCompact ? "text-sm leading-snug" : "text-base sm:text-lg",
              )}
            >
              {DEAR_CREATIVE_NEWSLETTER_SIGNUP_HEADLINE}
            </h2>
            <p
              id={bodyId}
              className={cn(
                "text-muted-foreground",
                isCompact ? "text-xs leading-relaxed sm:text-sm" : "text-sm sm:text-base",
              )}
            >
              {DEAR_CREATIVE_NEWSLETTER_SIGNUP_BODY}
            </p>
          </div>
        </div>
        <div className={cn("shrink-0", !isCompact && "sm:pl-4")}>
          <Button asChild size={isCompact ? "sm" : "default"} className="w-full sm:w-auto">
            <a
              href={DEAR_CREATIVE_NEWSLETTER_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="dear-creative-newsletter-signup-link"
            >
              {DEAR_CREATIVE_NEWSLETTER_SIGNUP_BUTTON}
              <span className="sr-only"> (opens Dear Creative newsletter in a new tab)</span>
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
