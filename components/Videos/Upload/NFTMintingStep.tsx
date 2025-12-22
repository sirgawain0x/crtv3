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
    if (!address) {
      setMintError(
        "NFT contract address not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS environment variable."
      );
    }
  }, []);

  const handleMint = async () => {
    if (!client) {
      toast.error("Smart account client not initialized");
      return;
    }

    if (!nftContractAddress) {
      toast.error("NFT contract address not configured");
      return;
    }

    setIsMinting(true);
    setMintError(null);

    try {
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
        <CardTitle>Mint NFT for Your Video</CardTitle>
        <CardDescription>
          Mint an NFT for your video to enable Story Protocol IP registration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!nftContractAddress && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              NFT contract address is not configured. Please set{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
              </code>{" "}
              in your environment variables.
            </AlertDescription>
          </Alert>
        )}

        {nftContractAddress && (
          <>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Minting an NFT will create a unique token for your video that can be
                registered on Story Protocol. This requires a blockchain transaction.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <p>Contract: {nftContractAddress}</p>
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
                disabled={isMinting || !nftContractAddress}
                className="flex-1"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting...
                  </>
                ) : (
                  "Mint NFT"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

