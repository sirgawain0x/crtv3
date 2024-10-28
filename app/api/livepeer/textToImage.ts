'use server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { TextToImageParams } from 'livepeer/models/components';

export const getLivePeerAiGeneratedImages = async (
  params: TextToImageParams,
) => {
  const result = await fullLivepeer.generate.textToImage(params);

  console.log('txt to image', result);

  return result.imageResponse;
};
