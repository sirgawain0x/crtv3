'use server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { TextToImageParams, AudioToTextParams } from 'livepeer/models/components';

export const getLivePeerAiGeneratedImages = async ({
  prompt,
  modelId,
}: TextToImageParams) => {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${process.env.LIVEPEER_API_KEY}`);

  const raw = JSON.stringify({
    prompt,
    model_id: modelId,
    num_images_per_prompt: 4,
  });

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  };

  const response = await fetch(
    'https://dream-gateway.livepeer.cloud/text-to-image',
    requestOptions,
  );
  if (response.ok) {
    return {
      success: true,
      result: await response.json(),
    };
  } else {
    return {
      success: false,
      result: await response.json(),
    };
  }
};

import { openAsBlob } from 'node:fs';

export const generateSubtitles = async ({
  video,
  modelId = null,
}: AudioToTextParams) => {

  try {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${process.env.LIVEPEER_API_KEY}`);

    const raw = JSON.stringify({
      audio: await openAsBlob(video),
      model_id: modelId,
    });

    const requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };
  
      const response = await fetch(
        'https://dream-gateway.livepeer.cloud/audio-to-text',
        requestOptions,
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
  
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Error in audioToText API:', error);
      return { error: error.message || 'Internal Server Error' };
    }
};