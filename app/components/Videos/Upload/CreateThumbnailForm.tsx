import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from '../../ui/select'; // Adjust the import path as needed
import { Button } from '../../ui/button'; // Adjust the import path as needed
import { SparklesIcon } from 'lucide-react';
import Image from 'next/image';
import { Textarea } from '@app/components/ui/textarea';
import { Label } from '@app/components/ui/label';
import { getLivepeerAiGeneratedImages } from '@app/api/livepeer/livepeerAiActions';
import { Media } from 'livepeer/models/components';
import { RadioGroup, RadioGroupItem } from '@app/components/ui/radio-group';
import Skeleton from '@app/components/ui/skeleton';
import { toast } from 'sonner'; // Import toast from sonner instead

interface FormValues {
  aiModel: string;
  prompt: string;
}

type CreateThumbnailFormProps = {
  onSelectThumbnailImages: (imageUrl: string) => void;
};

const CreateThumbnailForm = ({
  onSelectThumbnailImages,
}: CreateThumbnailFormProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      aiModel: 'SG161222/RealVisXL_V4.0_Lightning',
      prompt: '',
    },
  });

  const [imagesUrl, setImagesUrl] = useState<Media[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState<boolean>(false);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setImagesUrl([]);
    setSelectedImage(undefined);

    try {
      const response = await getLivepeerAiGeneratedImages({
        prompt: data.prompt,
        modelId: data.aiModel,
        safetyCheck: true,
        numImagesPerPrompt: 4,
        width: 1024,
        height: 576,
        guidanceScale: 7.5,
      });

      if (!response.success || !response.result?.images) {
        throw new Error(response.error?.message || 'Failed to generate images');
      }

      // Ensure we're only passing serializable data
      const serializedImages = response.result.images.map((img) => ({
        url: img.url,
        nsfw: img.nsfw,
        seed: typeof img.seed === 'number' ? img.seed : Math.random(),
      }));

      setImagesUrl(serializedImages);
    } catch (error: any) {
      console.error('Error generating thumbnails:', error);
      toast.error(error.message || 'Failed to generate thumbnails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Updated imagesUrl state:', imagesUrl);
  }, [imagesUrl]);

  const handleSelectionChange = (value: string) => {
    setSelectedImage(value);
    onSelectThumbnailImages(value);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(onSubmit)(e);
      }}
      className="space-y-4"
    >
      <Controller
        name="aiModel"
        control={control}
        rules={{ required: 'AI Model is required' }}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger
              className="w-full md:w-[280px] lg:w-[320px]"
              data-testid="create-thumbnail-select"
            >
              <SelectValue placeholder="Select A Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Model</SelectLabel>
                {/* Only include verified working models */}
                <SelectItem value="SG161222/RealVisXL_V4.0_Lightning">
                  RealVisXL V4.0
                </SelectItem>
                <SelectItem value="stabilityai/stable-diffusion-2">
                  Stable Diffusion 2
                </SelectItem>
                <SelectItem value="CompVis/stable-diffusion-v1-4">
                  Stable Diffusion v1.4
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
        rules={{ required: 'Prompt is required' }}
        render={({ field }) => (
          <Textarea
            {...field}
            placeholder="Enter your prompt"
            className="min-h-[100px] w-full rounded border p-2 text-sm md:text-base"
            data-testid="create-thumbnail-prompt"
            rows={4}
          />
        )}
      />
      {errors.prompt && <p className="text-red-500">{errors.prompt.message}</p>}

      <Button type="submit" disabled={isSubmitting}>
        <SparklesIcon className="mr-1 h-4 w-4" />
        {isSubmitting ? 'Generating...' : 'Generate'}
      </Button>

      {errors['root'] && (
        <p className="text-red-500">{errors['root'].message}</p>
      )}

      {/* Render Skeletons while loading */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={idx}
              className="h-[200px] w-full rounded-md md:h-[250px]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {imagesUrl.map((image, index) => (
            <div key={`${image.url}-${index}-${image.seed}`} className="relative">
              {image.nsfw && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  NSFW Content
                </div>
              )}
              <div
                className={`relative aspect-video cursor-pointer overflow-hidden rounded-lg border-4 ${
                  selectedImage === image.url
                    ? 'border-[--color-brand-red-shade]'
                    : 'border-transparent hover:border-gray-200'
                }`}
                onClick={() => {
                  handleSelectionChange(image.url);
                }}
              >
                <Image
                  src={image.url}
                  alt={`AI Generated Thumbnail ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
};

export default CreateThumbnailForm;
