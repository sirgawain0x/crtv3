'use server';

import {
  isLivepeerAiCaptionsEnabled,
  livepeerAiCaptionsDisabledResult,
} from '@/lib/livepeer/livepeer-ai-gating';
import { serverLogger } from '@/lib/utils/logger';

type AudioToTextParams = {
  modelId?: string;
  formData?: FormData;
};

export async function getLivepeerAudioToText(params: AudioToTextParams = {}) {
  if (!isLivepeerAiCaptionsEnabled()) {
    return livepeerAiCaptionsDisabledResult();
  }

  if (!params.formData) {
    throw new Error('No audio payload provided for transcription');
  }

  const formData = params.formData;
  formData.append(
    'model_id',
    params.modelId?.trim() || 'openai/whisper-large-v3',
  );

  const apiKey = process.env.LIVEPEER_FULL_API_KEY;
  if (!apiKey) {
    throw new Error('Livepeer API key is not configured');
  }

  const response = await fetch(
    'https://livepeer.studio/api/beta/generate/audio-to-text',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    serverLogger.error('Livepeer audio-to-text error', {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Livepeer audio-to-text failed (${response.status})`);
  }

  return response.json();
}
