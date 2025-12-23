"use client";

import React, { useState, useEffect } from "react";
import { useSmartAccountClient } from "@account-kit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { mintVideoNFT, getNFTContractAddress } from "@/lib/sdk/nft/minting-service";
import type { Address } from "viem";

interface NFTMintingStepProps {
  videoAssetId: number;
  metadataURI: string;
  recipientAddress: Address;
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

  useEffect(() => {
    const address = getNFTContractAddress();
    setNftContractAddress(address);
    // Removed strict error check for missing env var
    // If missing, we default to Story Protocol minting (SPG)
  }, []);

  const handleMint = async () => {
    if (!client) {
      toast.error("Smart account client not initialized");
      return;
    }

    setIsMinting(true);
    setMintError(null);

    try {
      if (nftContractAddress) {
        // Standard ERC-721 Minting (Legacy/Manual mode)
        toast.info("Minting NFT...", {
          description: "Please confirm the transaction in your wallet",
        });

        const result = await mintVideoNFT(
          client,
          nftContractAddress,
          recipientAddress,
          metadataURI
        );

        toast.success("NFT minted successfully!", {
          description: `Token ID: ${result.tokenId}`,
        });

        onMintSuccess(result);
      } else {
        // Story Protocol SPG Minting (Default/modern mode)
        toast.info("Minting on Story Protocol...", {
          description: "Creating collection and registering IP asset",
        });

        // We need to import this dynamically or ensure it's imported at top
        const { mintVideoNFTOnStory } = await import("@/lib/sdk/nft/minting-service");

        const result = await mintVideoNFTOnStory(
          recipientAddress, // Creator is the initial owner
          recipientAddress, // Recipient
          metadataURI
        );

        toast.success("NFT minted & IP Registered!", {
          description: `Token ID: ${result.tokenId}`,
        });

        // Map SPG result to expected format
        onMintSuccess({
          tokenId: result.tokenId,
          contractAddress: result.collectionAddress,
          txHash: result.txHash
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to mint NFT";
      setMintError(errorMessage);
      toast.error("NFT minting failed", {
        description: errorMessage,
      });
    } finally {
      setIsMinting(false);
    }
  };

  if (!client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NFT Minting</CardTitle>
          <CardDescription>Connect your wallet to mint an NFT</CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
        {/* Info Alert based on mode */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            {nftContractAddress
              ? "Minting an NFT will create a unique token for your video."
              : "This action will create a dedicated NFT collection for your content and register this video as an IP Asset on Story Protocol."}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {nftContractAddress && <p>Contract: {nftContractAddress}</p>}
            <p>Recipient: {recipientAddress}</p>
            <p>Metadata URI: {metadataURI}</p>
          </div>
        </div>

        {mintError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{mintError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleMint}
            disabled={isMinting}
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

