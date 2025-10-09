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
import {
  updateVideoAssetMintingStatus,
  updateVideoAsset,
} from "@/services/video-assets";
import { createVideoAsset } from "@/services/video-assets";
import type { VideoAsset } from "@/lib/types/video-asset";

import { useSmartAccountClient } from "@account-kit/react";
import { useUniversalAccount } from "@/lib/hooks/accountkit/useUniversalAccount";
import { getLivepeerAsset } from "@/app/api/livepeer/assetUploadActions";
import { encodeFunctionData, createPublicClient, http } from "viem";
import { base } from "@account-kit/infra";
import { creativeTv1155Abi } from "@/lib/contracts/CreativeTV1155";

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [erroredInputName, setErroredInputName] = useState("");

  const methods = useForm<StepperFormValues>({
    mode: "onTouched",
  });

  const [metadata, setMetadata] = useState<TVideoMetaForm>();
  const [livepeerAsset, setLivepeerAsset] = useState<Asset>();
  const [subtitlesUri, setSubtitlesUri] = useState<string>();
  const [thumbnailUri, setThumbnailUri] = useState<string>();
  const [dbAssetId, setDbAssetId] = useState<number | null>(null);
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null);

  const { address, type, loading } = useUniversalAccount();
  const { client } = useSmartAccountClient({});
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<Error | null>(null);

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
      <div className={activeStep === 1 ? "block" : "hidden"}>
        <CreateInfo onPressNext={handleCreateInfoSubmit} />
      </div>
      <div className={activeStep === 2 ? "block" : "hidden"}>
        <FileUpload
          newAssetTitle={metadata?.title}
          metadata={metadata}
          onFileSelect={(file) => {}}
          onFileUploaded={(videoUrl: string) => {}}
          onSubtitlesUploaded={(subtitlesUri?: string) => {
            setSubtitlesUri(subtitlesUri);
          }}
          onPressBack={() =>
            setActiveStep((prevActiveStep) => prevActiveStep - 1)
          }
          onPressNext={(livepeerAsset: any) => {
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
            }).then((dbAsset) => {
              setVideoAsset(dbAsset as VideoAsset);
              setActiveStep((prevActiveStep) => prevActiveStep + 1);
            });
          }}
        />
      </div>
      <div className={activeStep === 3 ? "block" : "hidden"}>
        <CreateThumbnailWrapper
          livePeerAssetId={livepeerAsset?.id}
          thumbnailUri={thumbnailUri}
          onComplete={async (data: {
            thumbnailUri: string;
            nftConfig?: {
              isMintable: boolean;
              maxSupply: number;
              price: number;
              royaltyPercentage: number;
            };
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
              // Set status to 'published'. If minting occurs, it will later be set to 'minted'.
              await updateVideoAsset(videoAsset?.id as number, {
                thumbnailUri: data.thumbnailUri,
                status: "published",
                max_supply: data.nftConfig?.maxSupply || null,
                price: data.nftConfig?.price || null,
                royalty_percentage: data.nftConfig?.royaltyPercentage || null,
                metadata_uri:
                  latestAsset?.storage?.ipfs?.nftMetadata?.url || null,
                requires_metoken: data.meTokenConfig?.requireMeToken || false,
                metoken_price: data.meTokenConfig?.priceInMeToken || null,
              });

              // If minting is enabled, trigger on-chain mint on Base
              if (data.nftConfig?.isMintable) {
                const erc1155Address = (process.env
                  .NEXT_PUBLIC_ERC1155_ADDRESS_BASE || "") as `0x${string}`;
                if (!erc1155Address) {
                  toast.error("ERC1155 address not configured");
                } else if (!address) {
                  toast.error("Wallet not connected");
                } else {
                  const tokenId = BigInt(videoAsset?.id || 0);
                  const amount = BigInt(1);
                  const dataBytes = "0x" as `0x${string}`;

                  const dataCalldata = encodeFunctionData({
                    abi: creativeTv1155Abi,
                    functionName: "mint",
                    args: [address as `0x${string}`, tokenId, amount, dataBytes],
                  });

                  setIsMinting(true);
                  setMintError(null);
                  
                  try {
                    if (!client) {
                      toast.error("Smart account client not available. Please ensure your wallet is connected.");
                      return;
                    }

                    // Use smart account client for minting via user operation
                    const operation = await client.sendUserOperation({
                      uo: {
                        target: erc1155Address,
                        data: dataCalldata,
                        value: BigInt(0),
                      },
                    });
                    
                    // Wait for the transaction to be mined
                    const txHash = await client.waitForUserOperationTransaction({
                      hash: operation.hash,
                    });
                    
                    console.log("Mint transaction hash:", txHash);
                      
                    // Update the status with the transaction hash
                    await updateVideoAssetMintingStatus(videoAsset?.id as number, {
                      token_id: tokenId.toString(),
                      contract_address: erc1155Address,
                      mint_transaction_hash: txHash,
                    });
                    
                    const tokenIdNum = tokenId.toString();
                    const zoraUrl = `https://zora.co/collect/base:${erc1155Address}/${tokenIdNum}`;
                    const openseaUrl = `https://opensea.io/assets/base/${erc1155Address}/${tokenIdNum}`;
                    const basescanTokenUrl = `https://basescan.org/token/${erc1155Address}?a=${tokenIdNum}`;
                    const basescanTxUrl = `https://basescan.org/tx/${txHash}`;

                    toast.success("NFT minted successfully", {
                      description: (
                        <div className="space-y-1">
                          <a
                            href={openseaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View on OpenSea
                          </a>
                          <span className="mx-2">•</span>
                          <a
                            href={basescanTokenUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View token on BaseScan
                          </a>
                          <span className="mx-2">•</span>
                          <a
                            href={basescanTxUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View mint tx
                          </a>
                          </div>
                        ),
                        action: {
                          label: "List on Zora",
                          onClick: () => window.open(zoraUrl, "_blank"),
                        },
                      });
                  } catch (e: any) {
                    console.error("Mint failed", e);
                    const err = e instanceof Error ? e : new Error(e?.message || "Could not mint NFT");
                    setMintError(err);
                    toast.error("Mint failed", {
                      description: err.message,
                    });
                  } finally {
                    setIsMinting(false);
                  }
                }
              }

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
      </div>
    </>
  );
};

export default HookMultiStepForm;
