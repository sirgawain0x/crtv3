import { createMigrationConfig } from "@privy-io/alchemy-migration";
import { base } from "@account-kit/infra";
import { createBaseTransport } from "@/lib/chain/base-transport";

const migrationRedirectUrl =
  process.env.NEXT_PUBLIC_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

export const alchemyMigrationConfig = createMigrationConfig(
  {
    transport: createBaseTransport(),
    chain: base,
    ssr: true,
  } as never,
  {
    auth: {
      sections: [
        [{ type: "email", emailMode: "otp" }, { type: "passkey" }],
        [
          {
            type: "social",
            authProviderId: "google",
            mode: "redirect",
            redirectUrl: migrationRedirectUrl,
          },
          {
            type: "social",
            authProviderId: "twitch",
            mode: "redirect",
            redirectUrl: migrationRedirectUrl,
          },
        ],
      ],
    },
  },
);
