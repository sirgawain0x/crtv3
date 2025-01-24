'use server';
import { Livepeer } from '@livepeer/ai';
import { TextToImageParams } from 'livepeer/models/components';

interface LivepeerAiResponse {
  images: Array<{
    url: string;
    nsfw: boolean;
    seed: number;
  }>;
}

interface AiGenerationResult {
  success: boolean;
  result?: {
    images: Array<{
      url: string;
      nsfw: boolean;
      seed: number;
    }>;
  };
  error?: {
    message: string;
    status: number;
    details: any;
  };
}

export type LivepeerAiModel =
  | 'black-forest-labs/FLUX.1-dev'
  | 'stable-diffusion-v1-5/stable-diffusion-v1-5';

export async function getLivepeerAiModels() {
  return {
    FLUX: 'black-forest-labs/FLUX.1-dev' as const,
    STABLE_DIFFUSION: 'stable-diffusion-v1-5/stable-diffusion-v1-5' as const,
  };
}

export async function getDefaultAiModel() {
  return 'black-forest-labs/FLUX.1-dev' as LivepeerAiModel;
}

const livepeerAi = new Livepeer({
  httpBearer: process.env.LIVEPEER_FULL_API_KEY as string,
});

export const getLivepeerAiGeneratedImages = async ({
  prompt,
  modelId,
  safetyCheck = true,
  numImagesPerPrompt = 2,
  width = 1024,
  height = 576,
  guidanceScale = 7.5,
}: {
  prompt: string;
  modelId?: string;
  safetyCheck?: boolean;
  numImagesPerPrompt?: number;
  width?: number;
  height?: number;
  guidanceScale?: number;
}) => {
  try {
    const actualModelId = modelId || await getDefaultAiModel();

    console.log('Generating AI images with params:', {
      prompt,
      modelId: actualModelId,
      safetyCheck,
    });

    const result = await livepeerAi.generate.textToImage({
      modelId: actualModelId,
      prompt: prompt,
      numImagesPerPrompt: numImagesPerPrompt,
      safetyCheck: safetyCheck,
      width: width,
      height: height,
      guidanceScale: guidanceScale,
      numInferenceSteps: 50,
    });

    console.log('AI generation result:', result);

    return {
      success: true,
      result: {
        images:
          result?.imageResponse?.images?.map((img) => ({
            url: img?.url,
            nsfw: img?.nsfw,
            seed: img?.seed,
          })) || [],
      },
    };
  } catch (error: any) {
    console.error('Error generating AI images:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to generate images',
        status: error.status || 500,
        details: error.response?.data || error,
      },
    };
  }
};
