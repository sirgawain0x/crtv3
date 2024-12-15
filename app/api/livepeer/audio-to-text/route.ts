'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { GenAudioToTextResponse } from 'livepeer/models/operations';
import { SubtitleResponse } from '@app/lib/types';

export async function dynamic() {
  return {
    forceDynamic: true,
  };
}

export async function POST(req: NextRequest) {
  // Setup request timeout using AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    // Retrieve request body formData object
    const formData = await req.formData();

    // Append additional params to formData object
    formData.append('model_id', 'openai/whisper-large-v3');

    // Validate request body formData includes audio param
    if (!formData.get('audio')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Audio file is required',
        },
        {
          status: 400,
        },
      );
    }

    // Set request options object
    const options = {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
      },
      signal: controller.signal,
    };

    // Send POST request to Livepeer LLM endpoint
    const res = await fetch(
      'https://livepeer.studio/api/beta/generate/audio-to-text',
      options,
    );

    clearTimeout(timeout);

    const result = await res.json();

    // If request failed, send error response
    if (!result.ok) {
      console.error('Audio-to-text error: ', result.statusText);
      return NextResponse.json(
        {
          success: false,
          message: result.statusText || 'Translation failed...',
        },
        {
          status: result.status,
        },
      );
    }

    // Get response data
    const data = await result.json();

    // Send NextResponse
    return NextResponse.json(
      {
        success: true,
        response: data.textResponse,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error in audio-to-text conversion:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      {
        status: 500,
      },
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin':
        process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
