import {
  createConfig,
  cookieStorage,
  type AlchemyAccountsUIConfig,
  type CreateConfigProps,
} from "@account-kit/react";
import { alchemy, base } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";
import { modularAccountFactoryAddresses } from "./lib/utils/modularAccount";
import { SITE_TOPIC_LOGO } from "./context/context";
import Image from "next/image";
import React from "react";

// Define the chains we want to support (Base only)
export const chains = [base];

// Default chain for initial connection
const defaultChain = base;

// Create transport
const transport = alchemy({
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
});

// Create query client
export const queryClient = new QueryClient();

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "linear",
  auth: {
    sections: [
      [{ type: "email", emailMode: "otp" }],
      [
        { type: "passkey" },
        { type: "social", authProviderId: "google", mode: "popup" },
        { type: "social", authProviderId: "facebook", mode: "popup" },
      ],
    ],
    addPasskeyOnSignup: true,
    header: React.createElement(Image, {
      src: SITE_TOPIC_LOGO,
      alt: "Site Logo",
      width: 80,
      height: 80,
    }),
  },
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL,
};

// Create the Account Kit config
export const config = createConfig(
  {
    transport,
    chain: defaultChain,
    chains: chains.map((chain) => ({
      chain,
      transport,
    })),
    ssr: true,
    storage: cookieStorage,
    enablePopupOauth: true,
    accountConfig: {
      type: "ModularAccountV2",
      accountParams: {
        mode: "7702", // Use EIP-7702 mode for Alchemy swap compatibility
        factoryAddresses: modularAccountFactoryAddresses,
      },
      gasManagerConfig: {
        policyId: process.env.POLICY_ID,
        sponsorUserOperations: true,
      },
    },
  } as CreateConfigProps,
  uiConfig
);
