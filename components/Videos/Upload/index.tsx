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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TVideoMetaForm } from "@/components/Videos/Upload/Create-info";
import { updateVideoAsset } from "@/services/video-assets";
import { createVideoAsset } from "@/services/video-assets";
import type { VideoAsset } from "@/lib/types/video-asset";

import { useUniversalAccount } from "@/lib/hooks/accountkit/useUniversalAccount";
import { getLivepeerAsset } from "@/app/api/livepeer/assetUploadActions";
import { useAutoDeployContentCoin } from "@/lib/hooks/marketplace/useAutoDeployContentCoin";

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
    console.log('🎬 Step 1 Submit:', { data, assetId: asset.id });

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
        console.debug('MeToken lookup skipped');
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
      });

      console.log('✅ Video asset created in DB:', dbAsset);
      setVideoAsset(dbAsset as VideoAsset);
      setActiveStep(2); // Move to Thumbnail step
    } catch (error) {
      console.error('❌ Failed to create video asset in DB:', error);
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
        <CreateDetailsAndUpload onPressNext={handleStep1Submit} />
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
              console.error("Video asset is null or missing ID:", videoAsset);
              return;
            }

            try {
              const latestAsset = await getLivepeerAsset(livepeerAsset.id);

              // --- PUBLISH LOGIC ---
              const updatedAsset = await updateVideoAsset(videoAsset.id, {
                thumbnailUri: data.thumbnailUri,
                status: "published",
                metadata_uri: latestAsset?.storage?.ipfs?.nftMetadata?.url || null,
                requires_metoken: data.meTokenConfig?.requireMeToken || false,
                metoken_price: data.meTokenConfig?.priceInMeToken || null,
              });

              toast.success("Video uploaded and published successfully!");

              // --- STORY PROTOCOL IP REGISTRATION ---
              if (data.storyConfig?.registerIP && address) {
                try {
                  const metadataURI = latestAsset?.storage?.ipfs?.nftMetadata?.url;
                  
                  if (!metadataURI) {
                    toast.warning("Story Protocol registration skipped", {
                      description: "Video metadata URI is required for IP registration. Please ensure the video has been processed and metadata is available.",
                      duration: 8000,
                    });
                    console.warn("Story Protocol registration skipped: No metadata URI available");
                  } else {
                    // Check if user already minted an NFT via NFTMintingStep
                    if (data.nftMintResult?.tokenId && data.nftMintResult?.contractAddress) {
                      // User already minted an NFT - register the existing NFT on Story Protocol
                      console.log("Using existing NFT for Story Protocol registration:", data.nftMintResult);
                      
                      // First, update the video asset with the NFT info
                      // videoAsset.id is already validated above
                      await updateVideoAsset(videoAsset.id, {
                        contract_address: data.nftMintResult.contractAddress,
                        token_id: data.nftMintResult.tokenId,
                        metadata_uri: metadataURI,
                      });

                      // Then register the existing NFT as an IP Asset
                      toast.info("Registering existing NFT as IP Asset on Story Protocol...");
                      const { registerVideoAsIPAsset } = await import("@/services/story-protocol");
                      
                      const registrationResult = await registerVideoAsIPAsset(
                        {
                          ...updatedAsset,
                          contract_address: data.nftMintResult.contractAddress,
                          token_id: data.nftMintResult.tokenId,
                          metadata_uri: metadataURI,
                        } as VideoAsset,
                        address as `0x${string}`,
                        {
                          registerIP: true,
                          licenseTerms: data.storyConfig.licenseTerms,
                          metadataURI: metadataURI,
                        }
                      );

                      if (registrationResult.success) {
                        toast.success("IP registered on Story Protocol!", {
                          description: registrationResult.ipId 
                            ? `IP ID: ${registrationResult.ipId} | Token ID: ${data.nftMintResult.tokenId}`
                            : undefined,
                        });
                      } else {
                        toast.error(`Story Protocol registration failed: ${registrationResult.error}`);
                      }
                    } else {
                      // No existing NFT - mint and register on Story Protocol in one transaction
                      toast.info("Minting NFT and registering IP on Story Protocol...");
                      const { mintAndRegisterVideoIP } = await import("@/services/story-protocol");
                      
                      const mintResult = await mintAndRegisterVideoIP(
                        updatedAsset as VideoAsset,
                        address as `0x${string}`,
                        metadataURI,
                        undefined, // collectionName - will use default
                        undefined, // collectionSymbol - will use default
                        data.storyConfig.licenseTerms
                      );

                      if (mintResult.success) {
                        toast.success("NFT minted and IP registered on Story Protocol!", {
                          description: mintResult.ipId 
                            ? `IP ID: ${mintResult.ipId} | Token ID: ${mintResult.tokenId}`
                            : undefined,
                        });
                      } else {
                        toast.error(`Story Protocol mint and register failed: ${mintResult.error}`);
                      }
                    }
                  }
                } catch (storyError) {
                  console.error("Story Protocol registration error:", storyError);
                  toast.error("Failed to register IP on Story Protocol. You can try again later.");
                }
              }

              // --- AUTO DEPLOY CONTENT COIN ---
              if (creatorMeToken && address && metadata?.ticker) {
                toast.info("Deploying Content Coin Market...");
                await handleUploadSuccess(
                  metadata.title,
                  metadata.ticker,
                  creatorMeToken,
                  address
                );
                toast.success("Market Deployment Initiated!");
              }

              router.push("/discover");
            } catch (error) {
              console.error("Failed to complete video upload:", error);
              toast.error("Failed to complete video upload");
            }
          }}
        />
      )}
    </>
  );
};

export default HookMultiStepForm;
