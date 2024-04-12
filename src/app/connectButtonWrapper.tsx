'use client';
import { ConnectButton } from "thirdweb/react";
import { client } from "./client";
import { SmartWalletOptions, createWallet } from "thirdweb/wallets";
import { baseSepolia } from "thirdweb/chains";

export default function ConnectButtonWrapper() {  
  const chain = baseSepolia; // REPLACE WITH THE CHAIN YOU WANT TO USE
  const smartWalletConfig: SmartWalletOptions = {
    factoryAddress: "", // REPLACE WITH YOUR FACTORY ADDRESS (deploy one here: https://thirdweb.com/thirdweb.eth/AccountFactory)
    chain,
    gasless: true,
  };
  const inAppWallet = createWallet("inApp");

  return (
    <ConnectButton
      client={client}
      accountAbstraction={smartWalletConfig}
      wallets={[inAppWallet]}
      chain={chain}
      appMetadata={{
        name: "Example App",
        url: "https://example.com",
      }}
    />
  );
}
