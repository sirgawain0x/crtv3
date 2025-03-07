'use server';
import { aiClient } from '@app/lib/sdk/livepeer/aiClient';

type AudioToTextParams = {
  formData: FormData;
  modelId?: string;
  returnTimestamps?: string;
};

export const getLivepeerAudioToText = async (params: AudioToTextParams) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const file = params.formData.get('audio') as File;

    if (!file) throw new Error('No file uploaded');

    if (!(file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      throw new Error('File must be an audio or video file');
    }

    // if (params.modelId) params.formData.append('model_id', params.modelId as string);
    // Convert File to ArrayBuffer and then to Blob
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    const result = await aiClient?.generate?.audioToText({
      audio: blob,
      modelId: 'openai/whisper-large-v3',
      returnTimestamps: 'true',
    });

    clearTimeout(timeout);

    if (!result) {
      throw new Error('Failed to generate text from audio');
    }

    console.log({ audioToTextResponse: result });

    return result;
  } catch (error: any) {
    clearTimeout(timeout);
    console.error('Error generating text from audio:', error);
    throw new Error(error.message || 'Failed to generate text from audio');
  }
};
