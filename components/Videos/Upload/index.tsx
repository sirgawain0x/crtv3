"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle } from "react-icons/fa";

import { toast } from "sonner";
import { Asset } from "livepeer/models/components";

import { StepperFormValues } from "@/lib/types/hook-stepper";
// import { useOrbisContext } from "@/lib/sdk/orbisDB/context";
import StepperIndicator from "@/components/Videos/Upload/Stepper-Indicator";
import FileUpload from "@/components/Videos/Upload/FileUpload";
import CreateInfo from "@/components/Videos/Upload/Create-info";
import CreateThumbnailWrapper from "@/components/Videos/Upload/CreateThumbnailWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TVideoMetaForm } from "@/components/Videos/Upload/Create-info";
import {
  AssetMetadata,
  createAssetMetadata,
} from "@/lib/sdk/orbisDB/models/AssetMetadata";
import { updateVideoAsset } from "@/services/video-assets";
import { createVideoAsset } from "@/services/video-assets";
import type { VideoAsset } from "@/lib/types/video-asset";

import { useUniversalAccount } from "@/lib/hooks/accountkit/useUniversalAccount";
import { getLivepeerAsset } from "@/app/api/livepeer/assetUploadActions";

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

  const { address, type, loading } = useUniversalAccount();

  const router = useRouter();

  const {
    trigger,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
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

  const handleCreateInfoSubmit = (data: TVideoMetaForm) => {
    setMetadata(data);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
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
      
      {/* Step 1: Create Info */}
      {activeStep === 1 && (
        <CreateInfo onPressNext={handleCreateInfoSubmit} />
      )}
      
      {/* Step 2: File Upload */}
      {activeStep === 2 && (
        <FileUpload
          newAssetTitle={metadata?.title}
          metadata={metadata}
          onFileSelect={(file) => {}}
          onFileUploaded={(videoUrl: string) => {}}
          onPressBack={() =>
            setActiveStep((prevActiveStep) => prevActiveStep - 1)
          }
          onPressNext={(livepeerAsset: any) => {
            console.log('🎬 FileUpload onPressNext called with asset:', {
              id: livepeerAsset?.id,
              playbackId: livepeerAsset?.playbackId,
              hasAsset: !!livepeerAsset,
            });

            if (!livepeerAsset || !livepeerAsset.id) {
              console.error('❌ No valid livepeerAsset provided to onPressNext');
              toast.error("Failed to upload video. Please try again.");
              return;
            }

            // Set the asset FIRST
            setLivepeerAsset(livepeerAsset);
            
            // Create the video asset in the database and store its ID
            createVideoAsset({
              title: metadata?.title || "",
              asset_id: livepeerAsset.id,
              category: metadata?.category || "",
              location: metadata?.location || "",
              playback_id: livepeerAsset.playbackId || "",
              description: metadata?.description || "",
              creator_id: address || "",
              status: "draft",
              thumbnailUri: "",
              duration: livepeerAsset.duration || null,
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
              subtitles_uri: null,
              subtitles: null,
            }).then((dbAsset) => {
              console.log('✅ Video asset created in DB:', dbAsset);
              setVideoAsset(dbAsset as VideoAsset);
              setActiveStep((prevActiveStep) => prevActiveStep + 1);
            }).catch((error) => {
              console.error('❌ Failed to create video asset in DB:', error);
              toast.error("Failed to save video data. Please try again.");
            });
          }}
        />
      )}
      
      {/* Step 3: Create Thumbnail - Only render when we reach this step */}
      {activeStep === 3 && livepeerAsset?.id && (
        <CreateThumbnailWrapper
          livePeerAssetId={livepeerAsset.id}
          thumbnailUri={thumbnailUri}
          onComplete={async (data: {
            thumbnailUri: string;
            meTokenConfig?: {
              requireMeToken: boolean;
              priceInMeToken: number;
            };
          }) => {
            setThumbnailUri(data.thumbnailUri);

            // Ensure all required data is present
            if (!livepeerAsset || !metadata) {
              toast.error("Missing asset metadata. Please try again.");
              return;
            }

            if (!address) {
              toast.error("Wallet address is required to track points.");
              return;
            }

            try {
              // Fetch the latest Livepeer asset to get the most up-to-date metadata_uri
              const latestAsset = await getLivepeerAsset(livepeerAsset.id);
              
              // --- PUBLISH LOGIC ---
              // Update video asset with thumbnail, metadata, and MeToken configuration
              await updateVideoAsset(videoAsset?.id as number, {
                thumbnailUri: data.thumbnailUri,
                status: "published",
                metadata_uri:
                  latestAsset?.storage?.ipfs?.nftMetadata?.url || null,
                requires_metoken: data.meTokenConfig?.requireMeToken || false,
                metoken_price: data.meTokenConfig?.priceInMeToken || null,
              });

              // Video published successfully with MeToken configuration
              toast.success("Video uploaded and published successfully!");

              // Award points for uploading a video
              // await stack.track("video_upload", {
              //   account: address,
              //   points: 10,
              // });

              // const points = await stack.getPoints(address as string);
              // toast.success("Video uploaded and published successfully!", {
              //   description: `You earned 10 points! Your total balance is now ${points} points.`,
              // });

              router.push("/discover");
            } catch (error) {
              console.error("Failed to complete video upload:", error);
              toast.error("Failed to complete video upload", {
                description:
                  "Your video was uploaded but we couldn't save all information.",
              });
            }
          }}
        />
      )}
    </>
  );
};

export default HookMultiStepForm;
