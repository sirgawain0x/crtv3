"use client";

import { useState, useEffect } from "react";
import { useSmartAccountClient } from "@account-kit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, InfoIcon, XCircle, CheckCircle, ExternalLink } from "lucide-react";
import { CrossChainSwap } from "./CrossChainSwap";
import { TransferIP } from "./TransferIP";
import { createStoryPublicClient } from "@/lib/sdk/story/client";
import { getNFTContractAddress, mintVideoNFT } from "@/lib/sdk/nft/minting-service";
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
  const [mintSuccess, setMintSuccess] = useState<{
    tokenId: string;
    collectionAddress: string;
    txHash: string;
    ipId?: string;
  } | null>(null);
  const [nftContractAddress, setNftContractAddress] = useState<Address | null>(null);
  const [ipBalance, setIpBalance] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Get current Story Network from env to construct correct StoryScan URLs
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
  const isMainnet = network === "mainnet";
  const storyScanBaseUrl = isMainnet 
    ? "https://www.storyscan.io" 
    : "https://aeneid.storyscan.io";

  // Get the address to check balance for - use smart account address (where swap sends tokens)
  // Fall back to recipientAddress if smart account is not available
  const balanceCheckAddress = client?.account?.address || recipientAddress;

  useEffect(() => {
    const address = getNFTContractAddress();
    setNftContractAddress(address);
    checkBalance();
  }, [recipientAddress, client?.account?.address]);

  const checkBalance = async (retryCount = 0) => {
    // Use smart account address (where the swap sends tokens) or fall back to recipientAddress
    const addressToCheck = client?.account?.address || recipientAddress;
    if (!addressToCheck) {
      console.warn("No address available for balance check");
      return;
    }

    setIsCheckingBalance(true);
    try {
      // Get network from environment (client-side accessible)
      const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
      const rpcUrl = process.env.NEXT_PUBLIC_STORY_RPC_URL || (network === "mainnet" ? "https://rpc.story.foundation" : "https://rpc.aeneid.story.foundation");
      
      console.log("🔍 Starting balance check:", {
        network,
        rpcUrl,
        address: addressToCheck,
        expectedChainId: network === "mainnet" ? 1514 : 1315,
      });

      const publicClient = createStoryPublicClient();
      
      // Verify we're on the correct network by getting chain ID
      let chainId: number;
      try {
        chainId = await publicClient.getChainId();
        console.log("✅ Connected to chain:", chainId);
      } catch (chainError) {
        console.error("❌ Failed to get chain ID:", chainError);
        throw new Error(`Cannot connect to Story Protocol RPC. Please check your RPC URL: ${rpcUrl}`);
      }

      // Verify chain ID matches expected network
      const expectedChainId = network === "mainnet" ? 1514 : 1315;
      if (chainId !== expectedChainId) {
        console.warn(`⚠️ Chain ID mismatch! Expected ${expectedChainId} for ${network}, got ${chainId}`);
        console.warn("This might indicate a network configuration issue.");
      }

      console.log("📊 Fetching balance for address:", addressToCheck);
      const bal = await publicClient.getBalance({ address: addressToCheck });
      const formattedBalance = formatEther(bal);
      setIpBalance(formattedBalance);
      
      console.log("✅ IP Balance checked:", {
        address: addressToCheck,
        balance: formattedBalance,
        rawBalance: bal.toString(),
        chainId,
        network,
        rpcUrl,
      });

      // If balance is still 0 after a swap, retry a few times (cross-chain swaps can take time)
      if (parseFloat(formattedBalance) === 0 && retryCount < 3) {
        console.log(`⏳ Balance is 0, retrying in ${(retryCount + 1) * 2} seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          checkBalance(retryCount + 1);
        }, (retryCount + 1) * 2000); // 2s, 4s, 6s delays
      }
    } catch (e) {
      console.error("❌ Failed to check balance:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error details:", {
        error: errorMessage,
        address: addressToCheck,
        network: process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet",
        rpcUrl: process.env.NEXT_PUBLIC_STORY_RPC_URL || "not set",
      });
      
      // Retry on error if we haven't exceeded retry limit
      if (retryCount < 2) {
        console.log(`🔄 Retrying balance check in 2 seconds... (attempt ${retryCount + 1}/2)`);
        setTimeout(() => {
          checkBalance(retryCount + 1);
        }, 2000);
      } else {
        // Show error to user after all retries fail
        const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
        const rpcUrl = process.env.NEXT_PUBLIC_STORY_RPC_URL || "not configured";
        setMintError(
          `Failed to check IP balance. Error: ${errorMessage}. ` +
          `Network: ${network}, RPC: ${rpcUrl}. ` +
          `Please check your browser console for details and verify your environment variables are set correctly.`
        );
      }
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
        // Note: Story Protocol uses a custom transport, so it should work from any chain
        // However, we'll show a warning if not on Story network for better UX
        
        // Generate default collection details
        // In a real app, we might ask the user for these
        const collectionName = "My Creative Videos";
        const collectionSymbol = "CRTV";

        // Story Protocol requires server-side signing with a private key
        // since it only supports eth_sendRawTransaction (not eth_sendTransaction)
        // Call the server action which uses STORY_PROTOCOL_PRIVATE_KEY for signing
        const response = await fetch("/api/story/mint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creatorAddress: client.account.address,
            recipient: recipientAddress || client.account.address,
            metadataURI,
            collectionName,
            collectionSymbol,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to mint on Story Protocol");
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || "Minting failed");
        }

        // Clear any previous errors
        setMintError(null);
        
        // Show success state
        setMintSuccess({
          tokenId: result.tokenId,
          collectionAddress: result.collectionAddress,
          txHash: result.txHash,
          ipId: result.ipId,
        });

        // Also call the callback for parent component
        onMintSuccess({
          tokenId: result.tokenId,
          contractAddress: result.collectionAddress,
          txHash: result.txHash
        });
      }
    } catch (e) {
      console.error("Minting failed:", e);
      const errorMessage = e instanceof Error ? e.message : "Minting failed";
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes("eth_sendTransaction") || errorMessage.includes("Unsupported method")) {
        setMintError(
          `Story Protocol only supports eth_sendRawTransaction (not eth_sendTransaction). ` +
          `This means transactions must be signed locally before sending. ` +
          `\n\nThe Story Protocol SDK requires a signer to:\n` +
          `1. Create the transaction\n` +
          `2. Sign it locally\n` +
          `3. Send it as a raw transaction\n` +
          `\nSince Account Kit smart accounts don't provide direct signing for Story Protocol, ` +
          `server-side signing is used with STORY_PROTOCOL_PRIVATE_KEY. ` +
          `The funding wallet (configured via STORY_PROTOCOL_PRIVATE_KEY) must have IP tokens to pay for gas fees. ` +
          `Make sure you've transferred IP tokens to the funding wallet using the transfer feature above.`
        );
      } else if (errorMessage.includes("network") || errorMessage.includes("chain") || errorMessage.includes("Chain ID")) {
        setMintError(
          `Story Protocol transaction failed. The Story Protocol SDK uses a custom connection to Story Network (Chain ID: ${expectedChainId}), ` +
          `but your wallet may need to be configured to sign transactions on that network. ` +
          `Please ensure your wallet supports Story Protocol or contact support for assistance.`
        );
      } else {
        setMintError(errorMessage);
      }
    } finally {
      setIsMinting(false);
    }
  };

  if (!client) {
    // ... (existing not connected state)
  }

  // Determine if user funds are sufficient (Threshold: 0.5 IP for safety)
  const hasSufficientFunds = ipBalance ? parseFloat(ipBalance) >= 0.5 : false;
  
  // Check if on Story Protocol network (for informational purposes)
  // Note: Story Protocol uses custom transport, so transactions work from any chain
  const isOnStoryNetwork = client?.chain?.id === STORY_CHAIN_ID;
  const expectedChainId = network === "mainnet" ? 1514 : 1315;

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
        {/* Network Info Alert - Show if not on Story network (informational only) */}
        {!nftContractAddress && !isOnStoryNetwork && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Your wallet is connected to {client?.chain?.name || "Base"} (Chain ID: {client?.chain?.id}).
              Story Protocol transactions will be executed on Story {network === "mainnet" ? "Mainnet" : "Testnet"} (Chain ID: {expectedChainId}) 
              using a custom connection. Your current network connection does not need to be changed.
            </AlertDescription>
          </Alert>
        )}
        {/* Balance Check */}
        <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md border">
          <div className="flex flex-col">
            <span className="text-muted-foreground">
              Story Protocol Balance ($IP):
              <span className="ml-2 text-xs">
                ({process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet"})
              </span>
            </span>
            <span className="font-semibold text-lg text-foreground">
              {ipBalance ? `${parseFloat(ipBalance).toFixed(4)} IP` : "Loading..."}
            </span>
            {balanceCheckAddress && (
              <span className="text-xs text-muted-foreground mt-1">
                Address: {balanceCheckAddress.slice(0, 6)}...{balanceCheckAddress.slice(-4)}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={checkBalance} disabled={isCheckingBalance}>
            {isCheckingBalance ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {/* Transfer IP Component - Users transfer IP tokens to funding wallet to pay for Story Protocol transactions */}
        {ipBalance && parseFloat(ipBalance) > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <TransferIP 
              onTransferSuccess={() => {
                // Refresh balance after transfer
                setTimeout(() => {
                  checkBalance(0);
                }, 2000);
              }} 
            />
          </div>
        )}

        {/* Swap Component if funds are low */}
        {ipBalance && !hasSufficientFunds && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <CrossChainSwap 
              onSwapSuccess={() => {
                // Wait a bit for cross-chain swap to finalize, then check balance with retries
                console.log("🔄 Swap completed, checking balance in 3 seconds...");
                setTimeout(() => {
                  checkBalance(0); // Start retry sequence
                }, 3000);
              }} 
            />
            <div className="text-center text-xs text-muted-foreground mt-2">
              You need at least 0.5 $IP to cover minting fees and gas.
            </div>
            {balanceCheckAddress && (
              <div className="text-center text-xs text-muted-foreground mt-1">
                Checking balance for: {balanceCheckAddress.slice(0, 6)}...{balanceCheckAddress.slice(-4)}
              </div>
            )}
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

        {mintSuccess && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="space-y-2">
              <div className="font-semibold text-green-800 dark:text-green-200">
                ✅ Successfully minted and registered on Story Protocol!
              </div>
              <div className="text-sm space-y-1 text-green-700 dark:text-green-300">
                <div>
                  <strong>Token ID:</strong> {mintSuccess.tokenId}
                </div>
                {mintSuccess.ipId && (
                  <div>
                    <strong>IP ID:</strong> {mintSuccess.ipId}
                  </div>
                )}
                <div>
                  <strong>Collection:</strong>{" "}
                  <span className="font-mono text-xs">
                    {mintSuccess.collectionAddress.slice(0, 6)}...{mintSuccess.collectionAddress.slice(-4)}
                  </span>
                </div>
                <div className="pt-2 space-y-1">
                  <a
                    href={`${storyScanBaseUrl}/tx/${mintSuccess.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline font-medium"
                  >
                    View transaction on StoryScan <ExternalLink className="h-3 w-3" />
                  </a>
                  {mintSuccess.ipId && (
                    <div>
                      <a
                        href={`${storyScanBaseUrl}/ip/${mintSuccess.ipId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline font-medium text-xs"
                      >
                        View IP Asset <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {mintError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{mintError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleMint}
            disabled={isMinting || !hasSufficientFunds || !!mintSuccess} // Disable if low funds or already succeeded
            className="flex-1"
          >
            {isMinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {nftContractAddress ? "Minting..." : "Minting & Registering..."}
              </>
            ) : mintSuccess ? (
              "✅ Minted Successfully"
            ) : (
              nftContractAddress ? "Mint NFT" : "Mint & Register IP"
            )}
          </Button>
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
              disabled={isMinting || !!mintSuccess}
            >
              Skip for Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

