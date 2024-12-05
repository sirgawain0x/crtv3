import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Setup request timeout using AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    // Retrieve request body
    const body = await req.json();
    const { text, source, target } = body;

    // Validate request body contains required fields
    if (!text || !source || !target) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { 
        status: 400,
      });
    }

    // Request body fields are the correct type
    if (typeof text !== 'string' || typeof source !== 'string' || typeof target !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Invalid input types'
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
    const result = await fetch('https://livepeer.studio/api/beta/generate/llm', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${process.env.LIVEPEER_API_KEY}`
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    // If request failed, send error response
    if (!result.ok) {
      console.error('Translation error: ', result.statusText);
      return NextResponse.json({
        success: false,
        message: result.statusText || 'Translation failed...'
      }, { 
        status: result.status,
      });
    }

    // Get response data
    const data = await result.json()
    
    // Send NextResponse 
    return NextResponse.json({
      success: true,
      response: data.llmResponse
    }, { 
      status: 200,
    });

  } catch (error: any) {
    clearTimeout(timeout);
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
