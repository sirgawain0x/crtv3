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
} from '../../../../components/ui/select'; // Adjust the import path as needed
import { Button } from '../../ui/button'; // Adjust the import path as needed
import { SparkleIcon } from 'lucide-react';

interface FormValues {
  aiModel: string;
  prompt: string;
}

const CreateThumbnailForm: React.FC = () => {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      aiModel: 'SG161222/RealVisXL_V4.0_Lightning', // Set default value if needed
      prompt: '',
    },
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch('/api/livepeer/textToImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: data.prompt,
          model_id: data.aiModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image.');
      }

      const result = await response.json();
      setImageUrl(result.imageUrl); // Adjust based on your API response
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
          <textarea
            {...field}
            placeholder="Enter your prompt"
            className="w-full rounded border p-2"
            rows={4}
          />
        )}
      />
      {errors.prompt && <p className="text-red-500">{errors.prompt.message}</p>}

      <Button type="submit" disabled={loading}>
        <SparkleIcon className="h-4 w-4" />
        {loading ? 'Generating...' : 'Generate Image'}
      </Button>

      {error && <p className="text-red-500">{error}</p>}
      {imageUrl && (
        <div className="mt-4">
          <img
            src={imageUrl}
            alt="Generated Thumbnail"
            className="h-auto max-w-full"
          />
        </div>
      )}
    </form>
  );
};

export default CreateThumbnailForm;
