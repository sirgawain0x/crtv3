"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/utils";

// Privacy / Terms: G2 can swap URLs if creativeplatform.xyz paths change.
const PRIVACY_URL = "https://creativeplatform.xyz/privacy";
const TERMS_URL = "https://creativeplatform.xyz/terms";

const CONSENT_COPY =
  "I agree to receive marketing text messages from Creative Platform about features, drops, Brand Pass, and community updates. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of any purchase.";

export function SmsOptInForm() {
  const formId = useId();
  const nameId = `${formId}-name`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const consentId = `${formId}-consent`;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phoneFilled = phone.trim().length > 0;
  const canSubmit = consentChecked && phoneFilled;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <h2 className="text-2xl font-semibold text-white">You&apos;re opted in</h2>
        <p className="mt-3 text-base text-white/80">
          Thanks for signing up for Creative Platform text alerts. We&apos;ll only text you
          after our carrier registration is approved.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-lg space-y-6"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor={nameId} className="text-base text-white">
          Name <span className="text-white/50">(optional)</span>
        </Label>
        <Input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 border-white/20 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:ring-[#EC407A]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={phoneId} className="text-base text-white">
          Mobile phone <span className="text-[#EC407A]">*</span>
        </Label>
        <Input
          id={phoneId}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="h-12 border-white/20 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:ring-[#EC407A]"
          placeholder="(555) 555-5555"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={emailId} className="text-base text-white">
          Email <span className="text-white/50">(optional)</span>
        </Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 border-white/20 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:ring-[#EC407A]"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <label
          htmlFor={consentId}
          className="flex cursor-pointer items-start gap-3 text-base leading-relaxed text-white"
        >
          <input
            id={consentId}
            name="smsConsent"
            type="checkbox"
            checked={consentChecked}
            onChange={(event) => setConsentChecked(event.target.checked)}
            className={cn(
              "mt-1 h-6 w-6 shrink-0 cursor-pointer rounded border-2 border-white/40 bg-[#161D2F]",
              "accent-[#EC407A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC407A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161D2F]",
            )}
          />
          <span>
            {CONSENT_COPY}{" "}
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#EC407A] underline underline-offset-2 hover:text-[#EC407A]/90"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href={TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#EC407A] underline underline-offset-2 hover:text-[#EC407A]/90"
            >
              Terms of Service
            </a>
            .
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "h-12 w-full rounded-lg text-base font-semibold text-white transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC407A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161D2F]",
          canSubmit
            ? "bg-[#EC407A] hover:bg-[#EC407A]/90"
            : "cursor-not-allowed bg-[#EC407A]/40",
        )}
      >
        Opt in to texts
      </button>
    </form>
  );
}
