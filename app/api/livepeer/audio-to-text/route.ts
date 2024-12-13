'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { GenAudioToTextResponse } from 'livepeer/models/operations';
import { SubtitleResponse } from '@app/lib/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Append additional params to formData object
    formData.append('model_id', 'openai/whisper-large-v3');

    // Validate request body
    if (!formData.get('audio')) {
      return NextResponse.json({
        success: false,
        message: 'Audio file is required'
      }, { 
        status: 400,
      });
    }

    // Setup request timeout using AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const options = {
      method: 'POST',
      body: formData,
      headers: {
          'Authorization': `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
          'Accept': 'application/json'
      },
      signal: controller.signal
    };

    const result = await fetch(`https://livepeer.studio/api/beta/generate/audio-to-text`, options);

    clearTimeout(timeout);

    if (!result.ok) {
      console.error('Audio-to-text error: ', result.text());
      return NextResponse.json({
        success: false,
        message: result.text() || 'Failed to transcribe audio...'
      }, { 
        status: result.status,
      });    
    }

    const data = await result.json()
    
    return NextResponse.json({
      success: true,
      response: data
    }, { 
      status: 200,
    });
  } catch (error) {
    console.error('Error in audio-to-text conversion:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { 
      status: 500,
    });
  }
}