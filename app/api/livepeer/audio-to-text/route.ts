'use server';

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'auto';

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const formData = await req.formData();

    formData.append('model_id', 'openai/whisper-large-v3');

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

    if (!process.env.LIVEPEER_FULL_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: 'Internal server error',
      }, { 
        statusText: 'Unauthorized',
        status: 401,
      });
    }

    const options = {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
      },
      signal: controller.signal,
    };

    const res = await fetch(
      'https://livepeer.studio/api/beta/generate/audio-to-text',
      options,
    );

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('Audio-to-text error: ', res.statusText);
      return NextResponse.json(
        {
          success: false,
          message: res.statusText || 'Translation failed...',
        },
        {
          status: res.status,
        },
      );
    }

    const data = await res.json();

    if (!data || typeof data !== 'object') {
      console.error('Invalid response format from Livepeer API');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid response from transcription service',
        },
        {
          status: 502,
        },
      );
    }

    // Send NextResponse
    return NextResponse.json(
      {
        success: true,
        response: data,
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
