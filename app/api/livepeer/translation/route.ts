import { NextRequest, NextResponse } from 'next/server';
import { Livepeer } from "@livepeer/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, source, target } = body;

    console.log('Translation request:', body);

    if (!text || !source || !target) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { 
        status: 400,
      });
    }

    const formData = new FormData();
    formData.append('text', `Translate '${text}' from ${source} to ${target}. Do not include any other words than the exact, grammatically correct translation.`);
    formData.append('model_id', 'meta-llama/Meta-Llama-3.1-8B-Instruct');
    formData.append('max_tokens', '256');

    console.log('Translation request:', formData);

    const result = await fetch('https://dream-gateway.livepeer.cloud/llm', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${process.env.LIVEPEER_API_KEY}`
      }
    });


    // if (!result.ok) {
    //   throw new Error(`HTTP error! status: ${result.status}`);
    // }

    // if (result?.error) {
    //   return NextResponse.json({
    //     success: false,
    //     message: result?.error || `Translation failed with code ${result?.rawResponse.status || 'UNKNOWN'}`,
    //   }, {
    //     status: 500,
    //   });
    // }

    console.log({ result });

    const data = await result.json()
    
    console.log('Translation response:', data);

    return NextResponse.json({
      success: true,
      response: result
    }, { 
      status: 200,
    });

  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Translation failed'
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Next.js 13+ App Router doesn't need explicit body parser config
// Size limits are now handled differently