'use server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { TextToImageParams } from 'livepeer/models/components';

export const getLivepeerAiGeneratedImages = async (
  params: TextToImageParams,
) => {
  try {
    const result = await fullLivepeer.generate.textToImage(params);
    console.log('txt to image', result);

    if (!result?.imageResponse?.images?.length) {
      return {
        success: false,
        result: 'No images generated',
      };
    }

    return {
      success: true,
      result: result.imageResponse,
    };
  } catch (error) {
    console.error('Error generating images:', error);
    return {
      success: false,
      result: error instanceof Error ? error.message : 'Failed to generate images',
    };
  }
};
