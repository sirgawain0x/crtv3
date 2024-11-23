'use server';
import { TextToImageParams } from 'livepeer/models/components';

export const getLivepeerAiGeneratedImages = async ({
  prompt,
  modelId,
}: TextToImageParams) => {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append(
    'Authorization',
    `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
  );

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
