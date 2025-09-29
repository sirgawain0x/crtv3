// app/api/coinbase/session-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from 'jose';

// CORS headers for security
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' // Replace with your actual domain
    : 'http://localhost:3000', // Development only
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Generate JWT for Coinbase CDP API authentication
async function generateJWT() {
  const apiKey = process.env.CDP_API_KEY;
  const apiSecret = process.env.CDP_API_SECRET;
  const projectId = process.env.CDP_PROJECT_ID;

  if (!apiKey || !apiSecret || !projectId) {
    throw new Error('Missing CDP credentials in environment variables');
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Create the CDP API key JSON structure as shown in the documentation
  const cdpApiKeyJson = {
    apiKey: apiKey,
    apiSecret: apiSecret,
    projectId: projectId
  };

  // Generate JWT with the correct structure for CDP API
  const jwt = await new SignJWT({
    iss: apiKey,
    aud: 'https://api.developer.coinbase.com',
    iat: now,
    exp: now + 3600, // 1 hour expiration
    sub: projectId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(apiSecret));

  return { jwt, cdpApiKeyJson };
}

// Verify wallet signature for authentication
async function verifyWalletSignature(address: string, signature: string, message: string): Promise<boolean> {
  try {
    // Import viem for signature verification
    const { verifyMessage } = await import('viem');
    
    // Verify the signature matches the address and message
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });
    
    return isValid;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, assets, signature, message } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400, headers: corsHeaders });
    }

    // Verify wallet signature for authentication
    if (!signature || !message) {
      return NextResponse.json({ 
        error: "Wallet signature required for security" 
      }, { status: 401, headers: corsHeaders });
    }

    const isValidSignature = await verifyWalletSignature(address, signature, message);
    if (!isValidSignature) {
      return NextResponse.json({ 
        error: "Invalid wallet signature" 
      }, { status: 401, headers: corsHeaders });
    }

  try {
    // Generate JWT token and CDP API key JSON for authentication
    const { jwt, cdpApiKeyJson } = await generateJWT();
    console.log('Generated JWT:', jwt);
    console.log('CDP API Key JSON:', JSON.stringify(cdpApiKeyJson, null, 2));

    // Get client IP for security validation
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Prepare the request body for Coinbase Session Token API
    const body = {
      addresses: [
        {
          address,
          blockchains: ["base"], // Base network for DAI
        },
      ],
      clientIp: clientIp,
      assets: assets || ["DAI"], // Request DAI specifically - using symbol format
    };

    console.log('Requesting session token with body:', JSON.stringify(body, null, 2));

    // Try JWT authentication first (as per documentation)
    console.log('Trying JWT authentication...');
    
    const coinbaseRes = await fetch(
      "https://api.developer.coinbase.com/onramp/v1/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      }
    );

    console.log('JWT authentication response status:', coinbaseRes.status);

    // If JWT fails, try with the CDP API key JSON approach
    if (!coinbaseRes.ok && coinbaseRes.status === 401) {
      console.log('JWT authentication failed, trying CDP API key JSON approach...');
      
      // Create a temporary file-like structure for the API key
      const apiKeyJsonString = JSON.stringify(cdpApiKeyJson);
      
      const apiKeyRes = await fetch(
        "https://api.developer.coinbase.com/onramp/v1/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CDP-API-KEY": process.env.CDP_API_KEY as string,
            "CDP-API-SECRET": process.env.CDP_API_SECRET as string,
            "CDP-PROJECT-ID": process.env.CDP_PROJECT_ID as string,
          },
          body: JSON.stringify(body),
        }
      );
      
      console.log('CDP API key authentication response status:', apiKeyRes.status);
      
      if (apiKeyRes.ok) {
        const data = await apiKeyRes.json();
        console.log('CDP API key authentication successful:', JSON.stringify(data, null, 2));
        
        if (!data.data || !data.data.token) {
          console.error('Invalid response structure:', data);
          return NextResponse.json({ 
            error: 'Invalid response from Coinbase API' 
          }, { status: 500, headers: corsHeaders });
        }
        
        return NextResponse.json({ sessionToken: data.data.token }, { headers: corsHeaders });
      }
    }

    if (!coinbaseRes.ok) {
      const error = await coinbaseRes.text();
      console.error('Coinbase API error:', error);
      return NextResponse.json({ 
        error: `Coinbase API error: ${coinbaseRes.status} - ${error}` 
      }, { status: 500, headers: corsHeaders });
    }

    const data = await coinbaseRes.json();
    
    // Log the response for debugging
    console.log('Coinbase API response:', JSON.stringify(data, null, 2));
    
    if (!data.data || !data.data.token) {
      console.error('Invalid response structure:', data);
      return NextResponse.json({ 
        error: 'Invalid response from Coinbase API' 
      }, { status: 500, headers: corsHeaders });
    }
    
    return NextResponse.json({ sessionToken: data.data.token }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error generating session token:', error);
    return NextResponse.json({ 
      error: `Failed to generate session token: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500, headers: corsHeaders });
  }
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ 
      error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500, headers: corsHeaders });
  }
}
