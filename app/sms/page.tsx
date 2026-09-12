import type { Metadata } from "next";
import { SmsOptInForm } from "./SmsOptInForm";

export const metadata: Metadata = {
  title: "SMS alerts | Creative Platform",
  description:
    "Opt in to optional SMS alerts from Creative Platform about features, drops, Brand Pass, and community updates.",
  openGraph: {
    title: "SMS alerts | Creative Platform",
    description:
      "Opt in to optional SMS alerts from Creative Platform about features, drops, Brand Pass, and community updates.",
    url: "/sms",
  },
};

export default function SmsOptInPage() {
  return (
    <div className="min-h-screen bg-[#161D2F] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#EC407A]">
            Creative Platform
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Text alerts from Creative Platform
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Get optional SMS about features, drops, Brand Pass, and community updates. Email
            still works without texts.
          </p>
        </header>

        <SmsOptInForm />
      </div>
    </div>
  );
}
