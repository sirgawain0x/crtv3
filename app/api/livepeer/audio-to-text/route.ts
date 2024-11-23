'user server';

import { NextRequest, NextResponse } from 'next/server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { GenAudioToTextResponse } from 'livepeer/models/operations';
import { SubtitleResponse } from '@app/lib/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // const file = formData.get('audio') as File;
    formData.append('model_id', 'openai/whisper-large-v3');

    console.log('audioToText resquest body: ', formData);

    // if (!file) {
    //   return NextResponse.json({
    //     success: false,
    //     message: 'Audio file is required'
    //   }, { 
    //     status: 400,
    //   });
    // }

    // const blob = new Blob([file], { type: 'video/mp4' });

    // console.log('blob', blob);

      const options = {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`
        }
      };

      const res = await fetch('https://dream-gateway.livepeer.cloud/audio-to-text', options)

      const result = await res.json();

      console.log('result', result);

    // if (result?.rawResponse.status !== 200) {
    //   return NextResponse.json({
    //     success: false,
    //     message: 'ERROR: Failed to generate text from audio: ' + result?.rawResponse.statusText
    //   }, { 
    //     status: result?.rawResponse.status || 500,
    //   });
    // }

    return NextResponse.json({
      success: true,
      result
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

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}