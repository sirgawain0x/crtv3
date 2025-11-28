import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "../../ui/button";
import { SparklesIcon, AlertCircle, Upload, CreditCard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useMeTokensSupabase } from "@/lib/hooks/metokens/useMeTokensSupabase";
import { uploadThumbnailToIPFS, uploadThumbnailFromBlob } from "@/lib/services/thumbnail-upload";
import { AlchemyMeTokenCreator } from "@/components/UserProfile/AlchemyMeTokenCreator";
import { useX402Payment } from "@/lib/hooks/payments/useX402Payment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Image from "next/image";

interface FormValues {
  thumbnailType: "custom" | "ai";
  customImage: File | null;
  aiPrompt: string;
  meTokenConfig: {
    requireMeToken: boolean;
    priceInMeToken: number;
  };
  selectedImage: string;
}

interface CreateThumbnailFormProps {
  livepeerAssetId?: string;
  assetReady?: boolean;
  onSelectThumbnailImages: (imageUrl: string) => void;
  onMeTokenConfigChange?: (meTokenConfig: {
    requireMeToken: boolean;
    priceInMeToken: number;
  }) => void;
}

const CreateThumbnailForm = ({
  livepeerAssetId,
  assetReady = false,
  onSelectThumbnailImages,
  onMeTokenConfigChange,
}: CreateThumbnailFormProps) => {
  const {
    control,
    watch,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    setValue,
    register,
  } = useForm<FormValues>({
    defaultValues: {
      thumbnailType: "custom",
      customImage: null,
      aiPrompt: "",
      meTokenConfig: {
        requireMeToken: false,
        priceInMeToken: 0,
      },
      selectedImage: "",
    },
  });

  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [aiImages, setAiImages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | undefined>();
  const [showMeTokenCreator, setShowMeTokenCreator] = useState(false);

  const { userMeToken, loading: meTokenLoading, checkUserMeToken } = useMeTokensSupabase();
  const { makePayment, isProcessing: isPaymentProcessing, isConnected } = useX402Payment();
  const requireMeToken = watch("meTokenConfig.requireMeToken");
  const thumbnailType = watch("thumbnailType");
  const customImage = watch("customImage");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUserMeToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle custom image upload
  useEffect(() => {
    if (customImage && thumbnailType === "custom") {
      // Upload thumbnail to IPFS immediately for persistence
      setThumbnailUploading(true);
      uploadThumbnailToIPFS(customImage, livepeerAssetId || 'unknown')
        .then((result) => {
          if (result.success && result.thumbnailUrl) {
            // Use the IPFS URL
            setCustomPreviewUrl(result.thumbnailUrl);
            setSelectedImage(result.thumbnailUrl);
            onSelectThumbnailImages(result.thumbnailUrl);
            toast.success("Custom thumbnail uploaded successfully!");
          } else {
            toast.error(result.error || "Failed to upload thumbnail");
            // Create temporary preview URL for display only
            const url = URL.createObjectURL(customImage);
            setCustomPreviewUrl(url);
            setSelectedImage(url);
            onSelectThumbnailImages(url);
            return () => URL.revokeObjectURL(url);
          }
        })
        .catch((error) => {
          console.error("Error uploading thumbnail:", error);
          toast.error("Failed to upload thumbnail");
          // Create temporary preview URL for display only
          const url = URL.createObjectURL(customImage);
          setCustomPreviewUrl(url);
          setSelectedImage(url);
          onSelectThumbnailImages(url);
          return () => URL.revokeObjectURL(url);
        })
        .finally(() => {
          setThumbnailUploading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customImage, thumbnailType, livepeerAssetId]);

  // Watch MeToken config changes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // Clear any previous errors first
    clearErrors("customImage");
    
    if (!file) {
      // Reset the file input value to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setValue("customImage", null);
      setCustomPreviewUrl(null);
      setSelectedImage(undefined);
      // Explicitly clear errors when user cancels selection
      clearErrors("customImage");
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("customImage", { message: "Please select an image file" });
      // Reset the file input to allow selecting a new file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setValue("customImage", null);
      // Clear preview state to avoid showing stale preview
      setCustomPreviewUrl(null);
      setSelectedImage(undefined);
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("customImage", { message: "File size must be less than 5MB" });
      // Reset the file input to allow selecting a new file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setValue("customImage", null);
      // Clear preview state to avoid showing stale preview
      setCustomPreviewUrl(null);
      setSelectedImage(undefined);
      return;
    }

    // File is valid - clear any errors and set the file
    clearErrors("customImage");
    setValue("customImage", file);
  };

  /**
   * Make x402 payment using the user's connected smart account
   * This is a client-side payment that requires wallet access
   */
  const makeX402PaymentWithWallet = async () => {
    try {
      // Check if wallet is connected
      if (!isConnected) {
        throw new Error('Please connect your wallet to make payments');
      }

      // Make the payment using the client-side hook
      const result = await makePayment({
        service: 'ai-thumbnail-generation',
        amount: '1000000', // 1 USDC (6 decimals) on Base
        endpoint: 'https://x402.payai.network/api/base/paid-content',
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  };

  const generateAiImage = async (prompt: string) => {
    try {
      const response = await fetch('/api/ai/generate-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt,
          service: 'gemini-2.5-flash',
        }),
      });

      const result = await response.json();
      
      if (result.success && result.images && result.images.length > 0) {
        return {
          success: true,
          images: result.images,
        };
      }
      
      return {
        success: false,
        error: result.error || "Gemini AI generation failed",
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "AI generation failed",
      };
    }
  };

  const handleAiGenerateWithPayment = async (prompt: string) => {
    setPaymentLoading(true);
    setAiLoading(true);
    
    try {
      // Check wallet connection first
      if (!isConnected) {
        throw new Error('Please connect your wallet to use AI generation');
      }

      // Step 1: Make x402 payment using client-side wallet
      toast.info('Processing payment...');
      const paymentResult = await makeX402PaymentWithWallet();
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      toast.success('Payment successful!');

      // Step 2: Generate AI image with Gemini after successful payment
      toast.info('Generating AI thumbnail...');
      const aiResult = await generateAiImage(prompt);
      
      if (aiResult.success) {
        setAiImages(aiResult.images);
        toast.success(`Generated ${aiResult.images.length} AI thumbnail${aiResult.images.length > 1 ? 's' : ''} with Gemini!`);
      } else {
        throw new Error(aiResult.error || "Gemini AI generation failed");
      }

    } catch (error) {
      console.error('AI Generation Error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate AI thumbnail");
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to generate AI thumbnail with Gemini",
      });
    } finally {
      setPaymentLoading(false);
      setAiLoading(false);
    }
  };

  const handleImageSelection = async (imageUrl: string) => {
    setSelectedImage(imageUrl);
    
    // If it's a blob URL (AI-generated image), upload to IPFS first
    if (imageUrl.startsWith('blob:')) {
      setThumbnailUploading(true);
      try {
        const result = await uploadThumbnailFromBlob(imageUrl, livepeerAssetId || 'unknown');
        if (result.success && result.thumbnailUrl) {
          // Use the IPFS URL instead of blob URL
          onSelectThumbnailImages(result.thumbnailUrl);
          setSelectedImage(result.thumbnailUrl);
          toast.success("AI thumbnail uploaded successfully!");
        } else {
          toast.error(result.error || "Failed to upload AI thumbnail");
          // Fallback to blob URL
          onSelectThumbnailImages(imageUrl);
        }
      } catch (error) {
        console.error("Error uploading AI thumbnail:", error);
        toast.error("Failed to upload AI thumbnail");
        // Fallback to blob URL
        onSelectThumbnailImages(imageUrl);
      } finally {
        setThumbnailUploading(false);
      }
    } else {
      // It's already a persistent URL (IPFS or other), use it directly
      onSelectThumbnailImages(imageUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Thumbnail Type Selection */}
      <Tabs value={thumbnailType} onValueChange={(value) => setValue("thumbnailType", value as "custom" | "ai")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Custom
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            AI Generate
          </TabsTrigger>
        </TabsList>

        {/* Custom Upload Tab */}
        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-4">
            <Label>Upload Thumbnail Image</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomImageChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mb-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
              <p className="text-sm text-gray-500">
                JPG, PNG, WebP up to 5MB
              </p>
              {errors.customImage && (
                <p className="text-red-500 text-sm mt-2">{errors.customImage.message}</p>
              )}
            </div>

            {/* Custom Image Preview */}
            {customPreviewUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={customPreviewUrl}
                    alt="Custom thumbnail preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* AI Generation Tab */}
        <TabsContent value="ai" className="space-y-4">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <Label className="text-blue-800 font-semibold">Paid AI Generation with Gemini</Label>
              </div>
              <p className="text-sm text-blue-700">
                Powered by Google&apos;s Gemini 2.5 Flash model. 
                Generate high-quality, photorealistic thumbnails for 1 USDC on Base.
              </p>
            </div>

            <div className="space-y-2">
              <Label>AI Prompt</Label>
              <Textarea
                {...register("aiPrompt", { required: "Prompt is required for AI generation" })}
                placeholder="Describe the thumbnail you want to generate... (e.g., 'A cyberpunk cityscape with neon lights', 'A person riding a camel in the desert')"
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Tip: Be descriptive! Gemini works best with detailed scene descriptions rather than just keywords.
              </p>
              {errors.aiPrompt && (
                <p className="text-red-500 text-sm">{errors.aiPrompt.message}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleAiGenerateWithPayment(watch("aiPrompt"))}
              disabled={aiLoading || paymentLoading || !watch("aiPrompt")}
              className="w-full"
            >
              {paymentLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </>
              ) : aiLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating with Gemini AI...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Generate AI Thumbnail with Gemini (1 USDC)
                </>
              )}
            </Button>

            {/* AI Generated Images */}
            {aiImages.length > 0 && (
              <div className="space-y-2">
                <Label>Generated Thumbnails</Label>
                <p className="text-xs text-gray-500">
                  Generated with Google Gemini 2.5 Flash (16:9 aspect ratio)
                </p>
                <RadioGroup
                  value={selectedImage}
                  onValueChange={handleImageSelection}
                  className="grid grid-cols-2 gap-4"
                >
                  {aiImages.map((image, index) => (
                    <div key={image.id || index} className="flex flex-col items-center">
                      <RadioGroupItem
                        value={image.url}
                        id={`ai-image-${index}`}
                        className="mb-2"
                      />
                      <Label htmlFor={`ai-image-${index}`} className="cursor-pointer">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border hover:border-blue-300 transition-colors">
                          <Image
                            src={image.url}
                            alt={`AI Generated Thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Gemini
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Messages */}
      {errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation Error</AlertTitle>
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      {/* MeToken Configuration Section */}
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
    </div>
  );
};

export default CreateThumbnailForm;