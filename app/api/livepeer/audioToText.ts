'use server';

import aiClient from '@app/lib/sdk/livepeer/aiClient';
import { Chunk } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { Chunk as LivepeerChunk } from '@livepeer/ai/models/components';

interface LivepeerTranscriptChunk {
  text: string;
  timestamp?: {
    start: number;
    end: number;
  };
}

interface AudioToTextResponse {
  chunks: Chunk[];
  text: string;
}

type AudioToTextParams = {
  formData: FormData;
  modelId?: string;
  returnTimestamps?: 'sentence' | 'word' | 'true' | 'false';
};

/**
 * Converts audio/video to text using Livepeer's audio-to-text API
 * @param params - Audio to text parameters
 * @param params.formData - FormData containing the audio file
 * @param params.modelId - Hugging Face model ID (e.g., 'openai/whisper-large-v3')
 * @param params.returnTimestamps - Timestamp format ('sentence', 'word', 'true', 'false')
 * @returns AudioToTextResponse containing transcribed text and chunks with timestamps
 */
export const getLivepeerAudioToText = async (
  params: AudioToTextParams,
): Promise<AudioToTextResponse> => {
  try {
    const file = params.formData.get('audio') as File;

    if (!file) {
      throw new Error('No file uploaded');
    }

    if (!(file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      throw new Error('File must be an audio or video file');
    }

    // Configure timestamp format based on the parameter
    let timestampFormat: string | undefined = 'true'; // default to 'sentence' ('true')
    if (params.returnTimestamps === 'word') {
      timestampFormat = 'word';
    } else if (params.returnTimestamps === 'false') {
      timestampFormat = 'false';
    }

    const result = await aiClient.generate.audioToText({
      audio: file,
      modelId: params.modelId || 'openai/whisper-large-v3',
      returnTimestamps: timestampFormat,
    });

    if (!result?.textResponse?.text) {
      throw new Error('Failed to generate audio to text: No text received');
    }

    // Transform the response to match our expected Chunk format
    const chunks: Chunk[] = (result?.textResponse?.chunks || []).map(
      (chunk: LivepeerChunk): Chunk => {
        // Ensure we have valid timestamps
        const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [0, 0];
        
        return {
          text: chunk.text || '',
          timestamp,
        };
      },
    );

    // Ensure we have valid text content
    if (!chunks.some((chunk) => chunk.text.trim())) {
      throw new Error('No valid text content found in the response');
    }

    return {
      chunks,
      text:
        result?.textResponse?.text ||
        chunks.map((chunk) => chunk.text).join(' '),
    };
  } catch (error: any) {
    console.error('Livepeer Audio to Text Error:', error);

    // Provide more specific error messages based on common failure cases
    if (error.message?.includes('413')) {
      throw new Error('File size too large. Please upload a smaller file.');
    } else if (error.message?.includes('415')) {
      throw new Error(
        'Unsupported file format. Please upload a valid audio or video file.',
      );
    } else if (error.message?.includes('429')) {
      throw new Error('Too many requests. Please try again later.');
    } else if (
      error.message?.includes('401') ||
      error.message?.includes('403')
    ) {
      throw new Error('Authentication failed. Please check your API key.');
    }

    throw new Error(error.message || 'Failed to process audio to text');
  }
};
