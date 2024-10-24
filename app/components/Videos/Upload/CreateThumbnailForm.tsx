import React, { useState } from 'react';
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
import { Input } from '@app/components/ui/input';
import { Textarea } from '@app/components/ui/textarea';
import { Label } from '@app/components/ui/label';
import { getLivePeerAiGeneratedImages } from '@app/api/livepeer/livepeerAiActions';
import { Media } from 'livepeer/models/components';

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
      aiModel: 'SG161222/RealVisXL_V4.0_Lightning', // Set default value if needed
      prompt: '',
    },
  });

  const [imagesUrl, setImagesUrl] = useState<Media[]>([]);

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await getLivePeerAiGeneratedImages({
        prompt: data.prompt,
        modelId: data.aiModel,
      });
      if (response.success) {
        setImagesUrl((currentImages) => [
          ...currentImages,
          ...response.result.images,
        ]);
      } else {
        throw new Error(response.result);
      }
    } catch (e) {
      console.log('Error', e);
      setError('root', {
        message: 'Error generating ai images',
      });
    }
  };

  console.log(imagesUrl);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="aiModel"
        control={control}
        rules={{ required: 'AI Model is required' }}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select A Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Models</SelectLabel>
                <SelectItem value="SG161222/RealVisXL_V4.0_Lightning">
                  Lightning
                </SelectItem>
                <SelectItem value="black-forest-labs/FLUX.1-schnell">
                  Black Forest
                </SelectItem>
                <SelectItem value="alimama-creative/FLUX.1-Turbo-Alpha">
                  Alima
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
            className="w-full rounded border p-2"
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
      {imagesUrl.map((img, idx) => (
        <div key={idx}>
          <Label
            className="relative block size-36"
            htmlFor={`thumbnail_checkbox_${idx}`}
          >
            <Input
              name="thumbnail_selector"
              type="radio"
              className="relative z-10"
              id={`thumbnail_checkbox_${idx}`}
              onChange={(e) => {
                // if (e.currentTarget.se) {
                onSelectThumbnailImages(img.url);
                // }
              }}
            />
            <Image
              className="absolute left-0 top-0 h-full w-full"
              src={img.url}
              alt={'thumbnail'}
            />
          </Label>
        </div>
      ))}
    </form>
  );
};

export default CreateThumbnailForm;
