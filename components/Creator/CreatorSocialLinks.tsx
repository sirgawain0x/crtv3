import type { ReactNode } from "react";
import Link from "next/link";
import { Instagram, Twitter } from "lucide-react";
import {
  sanitizeStoredSocialUrl,
  type CreatorSocialPlatform,
} from "@/lib/creator/social-profile-urls";

export type CreatorSocialLinksProps = {
  socialOrbUrl?: string | null;
  socialInstagramUrl?: string | null;
  socialXUrl?: string | null;
  className?: string;
};

function OrbMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}

const SOCIAL_LINK_CONFIG: {
  key: string;
  platform: CreatorSocialPlatform;
  label: string;
  icon: ReactNode;
  prop: keyof Pick<
    CreatorSocialLinksProps,
    "socialOrbUrl" | "socialInstagramUrl" | "socialXUrl"
  >;
}[] = [
  {
    key: "orb",
    platform: "orb",
    prop: "socialOrbUrl",
    label: "Orb profile",
    icon: <OrbMark className="h-4 w-4 text-[#ff7800]" />,
  },
  {
    key: "instagram",
    platform: "instagram",
    prop: "socialInstagramUrl",
    label: "Instagram profile",
    icon: <Instagram className="h-4 w-4" aria-hidden />,
  },
  {
    key: "x",
    platform: "x",
    prop: "socialXUrl",
    label: "X profile",
    icon: <Twitter className="h-4 w-4" aria-hidden />,
  },
];

export function CreatorSocialLinks({
  socialOrbUrl,
  socialInstagramUrl,
  socialXUrl,
  className,
}: CreatorSocialLinksProps) {
  const propsByKey = { socialOrbUrl, socialInstagramUrl, socialXUrl };

  const links = SOCIAL_LINK_CONFIG.flatMap((config) => {
    const raw = propsByKey[config.prop];
    const href = sanitizeStoredSocialUrl(config.platform, raw);
    if (!href) {
      return [];
    }
    return [{ key: config.key, href, label: config.label, icon: config.icon }];
  });

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={className} data-testid="creator-social-links">
      <div className="flex flex-wrap items-center gap-2">
        {links.map((item) => (
          <SocialIconLink key={item.key} href={item.href} label={item.label}>
            {item.icon}
          </SocialIconLink>
        ))}
      </div>
    </div>
  );
}
