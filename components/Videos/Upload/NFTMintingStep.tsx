"use client";

import { useState, useEffect } from "react";
import { useSmartAccountClient } from "@account-kit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, InfoIcon, XCircle } from "lucide-react";
import { CrossChainSwap } from "./CrossChainSwap";
import { createStoryPublicClient } from "@/lib/sdk/story/client";
import { getNFTContractAddress, mintVideoNFT, createCollectionAndMintVideoNFTOnStory } from "@/lib/sdk/nft/minting-service";
import { formatEther, type Address } from "viem";
import { STORY_CHAIN_ID } from "@/lib/sdk/story/constants";

export interface NFTMintingStepProps {
  videoAssetId: number;
  metadataURI: string;
  recipientAddress?: Address;
  onMintSuccess: (result: {
    tokenId: string;
    contractAddress: Address;
    txHash: string;
  }) => void;
  onSkip?: () => void;
}

export function NFTMintingStep({
  videoAssetId,
  metadataURI,
  recipientAddress,
  onMintSuccess,
  onSkip,
}: NFTMintingStepProps) {
  const { client } = useSmartAccountClient({});
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [nftContractAddress, setNftContractAddress] = useState<Address | null>(null);
  const [ipBalance, setIpBalance] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  useEffect(() => {
    const address = getNFTContractAddress();
    setNftContractAddress(address);
    checkBalance();
  }, [recipientAddress]);

  const checkBalance = async () => {
    if (!recipientAddress) return;
    setIsCheckingBalance(true);
    try {
      const publicClient = createStoryPublicClient();
      const bal = await publicClient.getBalance({ address: recipientAddress });
      setIpBalance(formatEther(bal));
    } catch (e) {
      console.error("Failed to check balance", e);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleMint = async () => {
    if (!client || !client.account) return;

    setIsMinting(true);
    setMintError(null);

    try {
      if (nftContractAddress) {
        // Base Chain Minting
        // Check if on Base (optional, but good practice)
        // For now trusting the client configuration or just trying

        const result = await mintVideoNFT(
          client,
          nftContractAddress,
          recipientAddress || client.account.address,
          metadataURI
        );

        onMintSuccess(result);
      } else {
        // Story Protocol Minting
        // Check if connected to Story Chain
        if (client.chain?.id !== STORY_CHAIN_ID) {
          throw new Error(`Please switch your wallet to Story Network (Chain ID: ${STORY_CHAIN_ID})`);
        }

        // Generate default collection details
        // In a real app, we might ask the user for these
        const collectionName = "My Creative Videos";
        const collectionSymbol = "CRTV";

        const result = await createCollectionAndMintVideoNFTOnStory(
          client.account.address,
          recipientAddress || client.account.address,
          metadataURI,
          collectionName,
          collectionSymbol,
          client.transport // Pass the client transport to use the connected wallet
        );

        onMintSuccess({
          tokenId: result.tokenId,
          contractAddress: result.collectionAddress,
          txHash: result.txHash
        });
      }
    } catch (e) {
      console.error("Minting failed:", e);
      setMintError(e instanceof Error ? e.message : "Minting failed");
    } finally {
      setIsMinting(false);
    }
  };

  if (!client) {
    // ... (existing not connected state)
  }

  // Determine if user funds are sufficient (Threshold: 0.5 IP for safety)
  const hasSufficientFunds = ipBalance ? parseFloat(ipBalance) >= 0.5 : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {nftContractAddress ? "Mint NFT for Your Video" : "Mint & Register on Story Protocol"}
        </CardTitle>
        <CardDescription>
          {nftContractAddress
            ? "Mint an NFT for your video to enable Story Protocol IP registration"
            : "Create a new NFT collection and register your video as an IP Asset"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Check */}
        <div className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded-md border">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Story Protocol Balance ($IP):</span>
            <span className="font-semibold text-lg">
              {ipBalance ? `${parseFloat(ipBalance).toFixed(4)} IP` : "Loading..."}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={checkBalance} disabled={isCheckingBalance}>
            {isCheckingBalance ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {/* Swap Component if funds are low */}
        {ipBalance && !hasSufficientFunds && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <CrossChainSwap onSwapSuccess={checkBalance} />
            <div className="text-center text-xs text-muted-foreground mt-2">
              You need at least 0.5 $IP to cover minting fees and gas.
            </div>
          </div>
        )}

        {/* Info Alert based on mode */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            {nftContractAddress
              ? "Minting an NFT will create a unique token for your video."
              : "This action will create a dedicated NFT collection for your content and register this video as an IP Asset on Story Protocol."}
          </AlertDescription>
        </Alert>

        {/* ... (Existing details display: metadataURI etc) */}

        {mintError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{mintError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleMint}
            disabled={isMinting || !hasSufficientFunds} // Disable if low funds
            className="flex-1"
          >
            {isMinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {nftContractAddress ? "Minting..." : "Minting & Registering..."}
              </>
            ) : (
              nftContractAddress ? "Mint NFT" : "Mint & Register IP"
            )}
          </Button>
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
              disabled={isMinting}
            >
              Skip for Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

