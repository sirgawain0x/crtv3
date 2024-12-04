import { NextRequest, NextResponse } from 'next/server';
import { Livepeer } from "@livepeer/ai";

export async function POST(req: NextRequest) {
  try {
    // Retrieve request body
    const body = await req.json();
    const { text, source, target } = body;

    // Validate request body
    if (!text || !source || !target) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { 
        status: 400,
      });
    }

    // Additional input validation for text field
    if (text.length > 1000) {
      return NextResponse.json({ 
        success: false, 
        message: 'Text exceeds maximum length of 1000 characters' 
      }, { 
        status: 400,
      });
    }
  
    // Sanitize input
    const sanitizedText = text.trim();
    
    // Create formData object and append the text, model_id, max_tokens fields
    const formData = new FormData();
    formData.append('text', `Translate '${sanitizedText}' from ${source} to ${target}. Do not include any other words than the exact, grammatically correct translation.`);
    formData.append('model_id', 'meta-llama/Meta-Llama-3.1-8B-Instruct');
    formData.append('max_tokens', '256');

    // Send POST request to Livepeer LLM endpoint
    const result = await fetch('https://dream-gateway.livepeer.cloud/llm', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${process.env.LIVEPEER_API_KEY}`
      }
    });


    // Get response data
    const data = await result.json()
    
    // Send NextResponse with { ..., llmResponse: data.llmResponse } 
    return NextResponse.json({
      success: true,
      llmResponse: data.llmResponse
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
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
