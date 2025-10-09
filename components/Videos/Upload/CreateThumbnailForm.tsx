import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "../../ui/select"; // Adjust the import path as needed
import { Button } from "../../ui/button"; // Adjust the import path as needed
import { SparklesIcon, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getLivepeerAiGeneratedImages } from "@/app/api/livepeer/livepeerAiActions";
import { Media } from "livepeer/models/components";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useMeTokensSupabase } from "@/lib/hooks/metokens/useMeTokensSupabase";
import { AlchemyMeTokenCreator } from "@/components/UserProfile/AlchemyMeTokenCreator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FormValues {
  aiModel: string;
  prompt: string;
  meTokenConfig: {
    requireMeToken: boolean;
    priceInMeToken: number;
  };
  selectedImage: string;
}

interface CreateThumbnailFormProps {
  onSelectThumbnailImages: (imageUrl: string) => void;
  onMeTokenConfigChange?: (meTokenConfig: {
    requireMeToken: boolean;
    priceInMeToken: number;
  }) => void;
}

const CreateThumbnailForm = ({
  onSelectThumbnailImages,
  onMeTokenConfigChange,
}: CreateThumbnailFormProps) => {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      aiModel: "SG161222/RealVisXL_V4.0_Lightning",
      prompt: "",
      meTokenConfig: {
        requireMeToken: false,
        priceInMeToken: 0,
      },
      selectedImage: "",
    },
  });

  const [imagesUrl, setImagesUrl] = useState<Media[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [showMeTokenCreator, setShowMeTokenCreator] = useState(false);

  const { userMeToken, loading: meTokenLoading, checkUserMeToken } = useMeTokensSupabase();
  const requireMeToken = watch("meTokenConfig.requireMeToken");
  
  // Check for user's MeToken on mount
  useEffect(() => {
    checkUserMeToken();
  }, [checkUserMeToken]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const response = await getLivepeerAiGeneratedImages({
        prompt: data.prompt,
        modelId: data.aiModel,
        safetyCheck: true,
        numImagesPerPrompt: 1,
      });
      if (response.success) {
        setImagesUrl((currentImages) => [
          ...currentImages,
          ...response.result.images,
        ]);
      } else {
        const errorMsg =
          typeof response.result === "string"
            ? response.result
            : JSON.stringify(response.result);
        setError("root", {
          message: errorMsg || "Error generating AI images",
        });
        return;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);
      setError("root", {
        message: errorMsg || "Error generating AI images",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Updated imagesUrl state:", imagesUrl);
  }, [imagesUrl]);

  // Watch MeToken config and notify parent on change
  useEffect(() => {
    if (!onMeTokenConfigChange) return;
    const subscription = watch((value, { name }) => {
      const config = value.meTokenConfig;
      if (
        (name === "meTokenConfig" || name?.startsWith("meTokenConfig.")) &&
        config &&
        typeof config.requireMeToken === "boolean" &&
        typeof config.priceInMeToken === "number"
      )
        onMeTokenConfigChange({
          requireMeToken: config.requireMeToken,
          priceInMeToken: config.priceInMeToken,
        });
    });
    return () => subscription.unsubscribe();
  }, [onMeTokenConfigChange, watch]);

  const handleSelectionChange = (value: string) => {
    setSelectedImage(value);
    onSelectThumbnailImages(value); // Only update selection, do not trigger navigation
  };

  const radioValue = watch("selectedImage") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="aiModel"
        control={control}
        rules={{ required: "AI Model is required" }}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger
              className="w-[180px]"
              data-testid="create-thumbnail-select"
            >
              <SelectValue placeholder="Select A Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Model</SelectLabel>
                <SelectItem value="SG161222/RealVisXL_V4.0_Lightning">
                  RealVisXL
                </SelectItem>
                <SelectItem value="black-forest-labs/FLUX.1-schnell">
                  Black Forest
                </SelectItem>
                <SelectItem value="CompVis/stable-diffusion-v1-4">
                  CompVis
                </SelectItem>
                <SelectItem value="stabilityai/stable-diffusion-2">
                  Stability
                </SelectItem>
                <SelectItem value="Shakker-Labs/FLUX.1-dev-LoRA-One-Click-Creative-Template">
                  Shakker
                </SelectItem>
                <SelectItem value="aleksa-codes/flux-ghibsky-illustration">
                  Ghibsky
                </SelectItem>
                <SelectItem value="ByteDance/SDXL-Lightning">
                  Bytedance
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />
      {errors.aiModel && (
        <p className="text-red-500">{errors.aiModel.message}</p>
      )}

      {/* Add a prompt input field */}
      <Controller
        name="prompt"
        control={control}
        rules={{ required: "Prompt is required" }}
        render={({ field }) => (
          <Textarea
            {...field}
            placeholder="Enter your prompt"
            className="w-full rounded border p-2"
            data-testid="create-thumbnail-prompt"
            rows={4}
          />
        )}
      />
      {errors.prompt && <p className="text-red-500">{errors.prompt.message}</p>}

      {/* Move Generate button and image results here */}
      <Button type="submit" disabled={isSubmitting}>
        <SparklesIcon className="mr-1 h-4 w-4" />
        {isSubmitting ? "Generating..." : "Generate"}
      </Button>

      {errors["root"] && (
        <p className="text-red-500">
          Sorry, we couldn&rsquo;t generate your image from text. Please try
          again.
        </p>
      )}

      {/* Render Skeletons while loading */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="rounded-md w-full h-[200px]" />
          ))}
        </div>
      ) : (
        <RadioGroup
          value={radioValue}
          onValueChange={(value) => {
            setValue("selectedImage", value);
            handleSelectionChange(value);
          }}
          className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {imagesUrl.length === 0 && (
            <p className="col-span-full text-center text-gray-500">
              No images generated yet.
            </p>
          )}
          {imagesUrl.map((img, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <RadioGroupItem
                value={img.url}
                id={`thumbnail_checkbox_${idx}`}
                className="mb-2"
              />
              <Label htmlFor={`thumbnail_checkbox_${idx}`}>
                <Image
                  src={img.url}
                  alt={`Thumbnail ${idx + 1}`}
                  width={200}
                  height={200}
                  className="rounded-md border object-cover"
                />
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* MeToken Configuration section */}
      <div className="mt-8 space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Content Access Control</h3>
        
        {/* MeToken Status */}
        {meTokenLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : userMeToken ? (
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">MeToken Active</AlertTitle>
            <AlertDescription className="text-green-700">
              Your MeToken: {userMeToken.name} ({userMeToken.symbol})
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">No MeToken Found</AlertTitle>
            <AlertDescription className="text-amber-700">
              You need a MeToken to set access controls for your content.
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="ml-2 mt-2"
                onClick={() => setShowMeTokenCreator(true)}
              >
                Create MeToken
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* MeToken Creator Dialog */}
        {showMeTokenCreator && !userMeToken && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Create Your MeToken</CardTitle>
              <CardDescription>
                Create a MeToken to enable premium content access for your subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlchemyMeTokenCreator 
                onMeTokenCreated={(meToken) => {
                  setShowMeTokenCreator(false);
                  checkUserMeToken();
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* MeToken Gating Option */}
        <div className="flex items-center space-x-2">
          <Controller
            name="meTokenConfig.requireMeToken"
            control={control}
            render={({ field }) => (
              <Switch 
                checked={field.value} 
                onCheckedChange={field.onChange}
                disabled={!userMeToken}
              />
            )}
          />
          <Label className={!userMeToken ? "text-gray-400" : ""}>
            Require MeToken for Access
            {!userMeToken && " (Create a MeToken first)"}
          </Label>
        </div>

        {requireMeToken && userMeToken && (
          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label>Minimum MeToken Balance Required</Label>
              <Controller
                name="meTokenConfig.priceInMeToken"
                control={control}
                rules={{
                  required: "MeToken price is required",
                  min: { value: 0, message: "Price must be 0 or greater" },
                }}
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="pr-20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {userMeToken.symbol}
                    </span>
                  </div>
                )}
              />
              {errors.meTokenConfig?.priceInMeToken && (
                <p className="text-sm text-red-500">
                  {errors.meTokenConfig.priceInMeToken.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Users will need to hold at least this amount of your MeToken to access this content
              </p>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default CreateThumbnailForm;
