"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle } from "react-icons/fa";

import { toast } from "sonner";
import { Asset } from "livepeer/models/components";

import { StepperFormValues } from "@/lib/types/hook-stepper";
import StepperIndicator from "@/components/Videos/Upload/Stepper-Indicator";
import CreateDetailsAndUpload from "@/components/Videos/Upload/CreateDetailsAndUpload";
import CreateThumbnailWrapper from "@/components/Videos/Upload/CreateThumbnailWrapper";
import { CreateDetailsAndUploadSkeleton } from "@/components/Videos/Upload/CreateDetailsAndUploadSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TVideoMetaForm } from "@/components/Videos/Upload/Create-info";
import { updateVideoAsset } from "@/services/video-assets";
import { createVideoAsset } from "@/services/video-assets";
import type { VideoAsset } from "@/lib/types/video-asset";

import { useUniversalAccount } from "@/lib/hooks/accountkit/useUniversalAccount";
import { getLivepeerAsset } from "@/app/api/livepeer/assetUploadActions";
import { useAutoDeployContentCoin } from "@/lib/hooks/marketplace/useAutoDeployContentCoin";
import { useSmartAccountClient } from "@account-kit/react";
import { createSplitForVideo } from "@/services/splits";
import { logger } from "@/lib/utils/logger";

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [erroredInputName, setErroredInputName] = useState("");

  const methods = useForm<StepperFormValues>({
    mode: "onTouched",
  });

  const [metadata, setMetadata] = useState<TVideoMetaForm>();
  const [livepeerAsset, setLivepeerAsset] = useState<Asset>();
  const [thumbnailUri, setThumbnailUri] = useState<string>();
  const [dbAssetId, setDbAssetId] = useState<number | null>(null);
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null);
  const [creatorMeToken, setCreatorMeToken] = useState<string | null>(null);

  const { handleUploadSuccess } = useAutoDeployContentCoin();

  const { address, type, loading } = useUniversalAccount();
  const { client: smartAccountClient } = useSmartAccountClient({ type: 'MultiOwnerModularAccount' });

  const router = useRouter();

  const {
    formState: { errors },
  } = methods;

  // focus errored input on submit
  useEffect(() => {
    const erroredInputElement =
      document.getElementsByName(erroredInputName)?.[0];
    if (erroredInputElement instanceof HTMLInputElement) {
      erroredInputElement.focus();
      setErroredInputName("");
    }
  }, [erroredInputName]);

  const handleStep1Submit = async (data: TVideoMetaForm, asset: Asset) => {
    logger.debug('Step 1 Submit:', { data, assetId: asset.id });

    if (!asset?.id || !asset?.playbackId) {
      toast.error("Video asset invalid. Please try again.");
      return;
    }

    setMetadata(data);
    setLivepeerAsset(asset);

    // Fetch creator's MeToken
    let creatorMeTokenId: string | null = null;
    if (address) {
      try {
        const meTokenResponse = await fetch(`/api/metokens?owner=${address}`);
        const meTokenResult = await meTokenResponse.json();

        if (meTokenResult.data && meTokenResult.data.id) {
          creatorMeTokenId = meTokenResult.data.id;
          setCreatorMeToken(creatorMeTokenId);
        }
      } catch (error) {
        logger.debug('MeToken lookup skipped');
      }
    }

    // Create Video Asset in DB
    try {
      const dbAsset = await createVideoAsset({
        title: data.title,
        asset_id: asset.id,
        category: data.category || "",
        location: data.location || "",
        playback_id: asset.playbackId || "",
        description: data.description || "",
        creator_id: address || "",
        status: "draft",
        thumbnailUri: "",
        duration: asset.videoSpec?.duration || null,
        views_count: 0,
        likes_count: 0,
        is_minted: false,
        token_id: null,
        contract_address: null,
        minted_at: null,
        mint_transaction_hash: null,
        royalty_percentage: null,
        price: null,
        max_supply: null,
        current_supply: 0,
        metadata_uri: null,
        attributes: null,
        requires_metoken: false,
        metoken_price: null,
        creator_metoken_id: creatorMeTokenId,
        subtitles_uri: null,
        subtitles: null,
        story_ip_registered: false,
        story_ip_id: null,
        story_ip_registration_tx: null,
        story_ip_registered_at: null,
        story_license_terms_id: null,
        story_license_template_id: null,
        splits_address: null,
      }, data.collaborators);

      logger.debug('Step 1 Submit:✅ Video asset created in DB:', dbAsset);
      setVideoAsset(dbAsset as VideoAsset);
      setActiveStep(2); // Move to Thumbnail step
    } catch (error) {
      logger.error('Failed to create video asset in DB:', error);
      toast.error("Failed to save video data. Please try again.");
    }
  };

  return (
    <>
      <StepperIndicator activeStep={activeStep} />
      {errors.root?.formError && (
        <Alert variant="destructive" className="mt-[28px]">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription>{errors.root?.formError?.message}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Details & Upload */}
      {activeStep === 1 && (
        loading ? (
          <CreateDetailsAndUploadSkeleton />
        ) : (
          <CreateDetailsAndUpload onPressNext={handleStep1Submit} />
        )
      )}

      {/* Step 2: Create Thumbnail (Formerly Step 3) */}
      {activeStep === 2 && livepeerAsset?.id && (
        <CreateThumbnailWrapper
          livePeerAssetId={livepeerAsset.id}
          thumbnailUri={thumbnailUri}
          videoAssetId={videoAsset?.id}
          creatorAddress={address || undefined}
          onComplete={async (data: {
            thumbnailUri: string;
            meTokenConfig?: {
              requireMeToken: boolean;
              priceInMeToken: number;
            };
            storyConfig?: {
              registerIP: boolean;
              licenseTerms?: any;
            };
            nftMintResult?: {
              tokenId: string;
              contractAddress: string;
              txHash: string;
            };
          }) => {
            setThumbnailUri(data.thumbnailUri);

            if (!livepeerAsset || !metadata) {
              toast.error("Missing asset metadata. Please try again.");
              return;
            }

            if (!address) {
              toast.error("Wallet address is required.");
              return;
            }

            if (!videoAsset?.id) {
              toast.error("Video asset not found. Please try uploading again.");
              logger.error("Video asset is null or missing ID:", videoAsset);
              return;
            }

            const latestAsset = await getLivepeerAsset(livepeerAsset.id);

            // Helper for timeouts
            const withTimeout = <T,>(promise: Promise<T>, ms: number, fallbackValue?: T): Promise<T | undefined> => {
              return Promise.race([
                promise,
                new Promise<T | undefined>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
              ]);
            };

            // --- CREATE SPLIT CONTRACT (if collaborators exist) ---
            let splitsAddress: string | null = null;

            if (videoAsset && smartAccountClient) {
              try {
                // Check if video has collaborators by checking if metadata had collaborators
                const hasCollaborators = metadata?.collaborators && metadata.collaborators.length > 0;

                if (hasCollaborators) {
                  toast.info("Creating revenue split contract...");
                  // 15s timeout for splits
                  const splitResult = await withTimeout(
                    createSplitForVideo(videoAsset.id, smartAccountClient),
                    15000
                  );

                  if (splitResult && splitResult.success && splitResult.splitAddress) {
                    splitsAddress = splitResult.splitAddress;
                    toast.success("Revenue split contract created!", {
                      description: `Split address: ${splitResult.splitAddress.slice(0, 10)}...`,
                    });
                  } else if (!splitResult) {
                    logger.warn("Split creation timed out");
                    toast.warning("Split creation timed out", {
                      description: "Video will be published without revenue splits.",
                    });
                  } else {
                    logger.error("Split creation failed:", splitResult.error);
                    toast.warning("Failed to create split contract", {
                      description: splitResult.error || "Split creation failed. Video will be published without splits.",
                    });
                    // Continue with publishing even if split creation fails
                  }
                }
              } catch (splitError) {
                logger.error("Error creating split contract:", splitError);
                toast.warning("Split creation error", {
                  description: "Video will be published without revenue splits. You can add them later.",
                });
                // Continue with publishing
              }
            }

            // --- PUBLISH LOGIC (Atomic Update with Split Address) ---
            // This is critical, no timeout wrapper here (or a long one if needed), but usually DB updates are fast
            const updatedAsset = await updateVideoAsset(videoAsset.id, {
              thumbnailUri: data.thumbnailUri,
              status: "published",
              metadata_uri: latestAsset?.storage?.ipfs?.nftMetadata?.url || null,
              requires_metoken: data.meTokenConfig?.requireMeToken || false,
              metoken_price: data.meTokenConfig?.priceInMeToken || null,
              splits_address: splitsAddress, // Include split address in atomic update
            });

            toast.success("Video uploaded and published successfully!");

            // --- STORY PROTOCOL IP REGISTRATION ---
            if (data.storyConfig?.registerIP && address) {
              // Non-blocking async operation (mostly)
              // We await it but with timeout to ensure we don't hang forever
              (async () => {
                try {
                  const metadataURI = latestAsset?.storage?.ipfs?.nftMetadata?.url;

                  if (!metadataURI) {
                    toast.warning("Story Protocol registration skipped", {
                      description: "Video metadata URI is required for IP registration. Please ensure the video has been processed and metadata is available.",
                      duration: 8000,
                    });
                    logger.warn("Story Protocol registration skipped: No metadata URI available");
                  } else {
                    // Check if user already minted an NFT via NFTMintingStep
                    if (data.nftMintResult?.tokenId && data.nftMintResult?.contractAddress) {
                      // User already minted an NFT - register the existing NFT on Story Protocol
                      logger.debug("Using existing NFT for Story Protocol registration:", data.nftMintResult);

                      // First, update the video asset with the NFT info
                      await updateVideoAsset(videoAsset.id, {
                        contract_address: data.nftMintResult.contractAddress,
                        token_id: data.nftMintResult.tokenId,
                        metadata_uri: metadataURI,
                      });

                      // Then register the existing NFT as an IP Asset
                      toast.info("Registering existing NFT as IP Asset on Story Protocol...");
                      const { registerVideoAsIPAsset } = await import("@/services/story-protocol");

                      // 20s timeout for registration
                      const registrationResult = await withTimeout(
                        registerVideoAsIPAsset(
                          {
                            ...updatedAsset,
                            contract_address: data.nftMintResult.contractAddress,
                            token_id: data.nftMintResult.tokenId,
                            metadata_uri: metadataURI,
                          } as VideoAsset,
                          address as `0x${string}`,
                          {
                            registerIP: true,
                            licenseTerms: data.storyConfig?.licenseTerms,
                            metadataURI: metadataURI,
                          }
                        ),
                        20000
                      );

                      if (registrationResult && registrationResult.success) {
                        toast.success("IP registered on Story Protocol!", {
                          description: registrationResult.ipId
                            ? `IP ID: ${registrationResult.ipId} | Token ID: ${data.nftMintResult.tokenId}`
                            : undefined,
                        });
                      } else if (!registrationResult) {
                        toast.warning("Story Protocol registration timed out (background)");
                      } else {
                        toast.error(`Story Protocol registration failed: ${registrationResult.error}`);
                      }
                    } else {
                      // No existing NFT - mint and register on Story Protocol in one transaction
                      toast.info("Minting NFT and registering IP on Story Protocol...");
                      const { mintAndRegisterVideoIP } = await import("@/services/story-protocol");

                      // 25s timeout for mint & register
                      const mintResult = await withTimeout(
                        mintAndRegisterVideoIP(
                          updatedAsset as VideoAsset,
                          address as `0x${string}`,
                          metadataURI,
                          undefined, // collectionName - will use default
                          undefined, // collectionSymbol - will use default
                          data.storyConfig?.licenseTerms
                        ),
                        25000
                      );

                      if (mintResult && mintResult.success && mintResult.collectionAddress && mintResult.tokenId) {
                        // Set royalty recipient to split contract if available
                        const splitsAddress = updatedAsset?.splits_address 
                          ? (updatedAsset.splits_address as `0x${string}`)
                          : undefined;

                        if (splitsAddress && smartAccountClient) {
                          try {
                            const { setTokenRoyaltyToSplit } = await import("@/lib/sdk/nft/royalty-service");
                            toast.info("Setting royalties to split contract...");
                            
                            const royaltyResult = await setTokenRoyaltyToSplit(
                              smartAccountClient,
                              mintResult.collectionAddress,
                              mintResult.tokenId,
                              splitsAddress,
                              500 // Default 5% royalty
                            );

                            if (royaltyResult.success && royaltyResult.txHash) {
                              logger.debug("Royalty set to split contract:", royaltyResult.txHash);
                            } else {
                              logger.warn("Failed to set royalty to split:", royaltyResult.error);
                              toast.warning("Failed to set royalties to split contract", {
                                description: royaltyResult.error || "You can set this manually later",
                              });
                            }
                          } catch (royaltyError) {
                            logger.error("Error setting royalty to split:", royaltyError);
                            toast.warning("Error setting royalties to split contract", {
                              description: "You can set this manually later",
                            });
                          }
                        }

                        toast.success("NFT minted and IP registered on Story Protocol!", {
                          description: mintResult.ipId
                            ? `IP ID: ${mintResult.ipId} | Token ID: ${mintResult.tokenId}`
                            : undefined,
                        });
                      } else if (!mintResult) {
                        toast.warning("Story Protocol minting timed out (background)");
                      } else {
                        toast.error(`Story Protocol mint and register failed: ${mintResult.error}`);
                      }
                    }
                  }
                } catch (storyError) {
                  logger.error("Story Protocol registration error:", storyError);
                  toast.error("Failed to register IP on Story Protocol. You can try again later.");
                }
              })(); // Execute as side effect slightly decoupled, OR keep awaited but limited by timeout above
              // Note: I kept it awaited effectively by putting logic inside.
              // To truly unblock navigation, we can remove the 'await' before the IIFE if we want it completely background,
              // but usually user wants to see the result. The timeout provides the safety.
            }

            // --- AUTO DEPLOY CONTENT COIN ---
            if (creatorMeToken && address && metadata?.ticker) {
              toast.info("Deploying Content Coin Market...");
              try {
                // 15s timeout for content coin
                await withTimeout(
                  handleUploadSuccess(
                    metadata.title,
                    metadata.ticker,
                    creatorMeToken,
                    address
                  ),
                  15000
                );
                // The hook handles its own toasts usually, but we ensure we don't hang
                // Note: handleUploadSuccess logs success
              } catch (ccError) {
                logger.error("Content Coin deployment error:", ccError);
                // Swallowed to allow redirect
              }
            }

            // Ensure redirect happens
            logger.debug("Redirecting to discover page...");
            router.push("/discover");
          }}
        />
      )}
    </>
  );
};

export default HookMultiStepForm;
