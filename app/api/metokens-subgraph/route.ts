import { NextRequest, NextResponse } from 'next/server';

// MeTokens subgraph endpoint - now using Goldsky with envio.dev as backup
// Deployment ID: QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53
const DEFAULT_PROJECT_ID = 'project_cmh0iv6s500dbw2p22vsxcfo6';
const PROJECT_ID = process.env.GOLDSKY_PROJECT_ID || DEFAULT_PROJECT_ID;

const getSubgraphUrl = (subgraphName: string, version: string, specificAccessType?: 'public' | 'private') => {
  const isPrivate = !!process.env.GOLDSKY_API_KEY;
  const accessType = specificAccessType || (isPrivate ? 'private' : 'public');
  return `https://api.goldsky.com/api/${accessType}/${PROJECT_ID}/subgraphs/${subgraphName}/${version}/gn`;
};

const METOKENS_SUBGRAPH_URL = getSubgraphUrl('metokens', 'v0.0.1');

// Envio.dev backup endpoint for MeTokens subgraph
const ENVIO_METOKENS_SUBGRAPH_URL = process.env.ENVIO_METOKENS_SUBGRAPH_URL || 'https://indexer.dev.hyperindex.xyz/5becbbb/v1/graphql';

// Creative TV subgraph endpoint - now using Goldsky
// Deployment ID: QmbDp8Wfy82g8L7Mv6RCAZHRcYUQB4prQfqchvexfZR8yZ
const CREATIVE_TV_SUBGRAPH_URL = getSubgraphUrl('creative_tv', '0.1');

export async function POST(request: NextRequest) {
  // Read body once at the start so we can reuse it in error handlers
  let body: any;
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json(
      {
        error: 'Invalid Request Body',
        message: 'Failed to parse request body as JSON',
      },
      { status: 400 }
    );
  }

  try {
    console.log('📥 Subgraph proxy received request:', {
      query: body.query?.substring(0, 100) + '...',
      variables: body.variables,
    });

    // Determine endpoints
    const isPrivate = !!process.env.GOLDSKY_API_KEY;
    const privateEndpoint = getSubgraphUrl('metokens', 'v0.0.1', 'private');
    const publicEndpoint = getSubgraphUrl('metokens', 'v0.0.1', 'public');

    // Default to private if key exists, otherwise public
    let subgraphEndpoint = isPrivate ? privateEndpoint : publicEndpoint;
    console.log(`🔗 Forwarding to Goldsky subgraph endpoint: ${subgraphEndpoint}`);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isPrivate && process.env.GOLDSKY_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.GOLDSKY_API_KEY}`;
    }

    // Helper to perform fetch
    const performFetch = async (url: string, headers: Record<string, string>) => {
      return fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    };

    let response = await performFetch(subgraphEndpoint, headers);

    // Fallback logic: If private endpoint fails with 404 (not enabled) or 5xx (server error), try public
    if (isPrivate && (response.status === 404 || response.status >= 500)) {
      console.warn(`⚠️ Private endpoint returned ${response.status}, falling back to public endpoint...`);
      subgraphEndpoint = publicEndpoint;
      // Remove auth header for public request (optional, but cleaner)
      const publicHeaders = { ...headers };
      delete publicHeaders['Authorization'];

      response = await performFetch(subgraphEndpoint, publicHeaders);
    }

    // If Goldsky fails with server error (5xx) or network issue, try envio.dev as backup
    // Don't try backup for client errors (4xx) as those are likely configuration issues
    let goldskyErrorText: string | null = null;
    let endpointUsed: 'Goldsky' | 'envio.dev' = 'Goldsky';
    if (!response.ok && response.status >= 500) {
      goldskyErrorText = await response.text();
      console.warn(`⚠️ Goldsky subgraph request failed with server error (status: ${response.status}), trying envio.dev backup...`);
      
      try {
        const envioHeaders = {
          'Content-Type': 'application/json',
        };
        const envioResponse = await performFetch(ENVIO_METOKENS_SUBGRAPH_URL, envioHeaders);
        
        if (envioResponse.ok) {
          console.log('✅ Successfully using envio.dev backup endpoint');
          response = envioResponse;
          endpointUsed = 'envio.dev';
          goldskyErrorText = null; // Clear error text since we succeeded
        } else {
          // If envio also fails, log but continue to return the original Goldsky error
          console.error('❌ Both Goldsky and envio.dev endpoints failed');
          const envioErrorText = await envioResponse.text();
          console.error('❌ Envio.dev error:', {
            status: envioResponse.status,
            statusText: envioResponse.statusText,
            error: envioErrorText,
          });
        }
      } catch (envioError) {
        console.error('❌ Error connecting to envio.dev backup:', envioError);
        // Continue to return the original Goldsky error
      }
    }

    console.log('📊 Subgraph response status:', response.status);

    if (!response.ok) {
      // Use stored error text if available, otherwise read from response
      const errorText = goldskyErrorText || await response.text();
      console.error('❌ Subgraph request failed (tried both Goldsky and envio.dev):', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'Subgraph Query Failed',
          details: errorText,
          status: response.status,
          hint: response.status === 404
            ? 'Subgraph not found. Verify the Goldsky deployment ID and subgraph name.'
            : response.status === 429
              ? 'Rate limit exceeded. Please try again later.'
              : 'Subgraph server error. Both Goldsky and envio.dev endpoints may be down or experiencing issues.',
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for GraphQL errors in the response
    if (data.errors && data.errors.length > 0) {
      console.error('⚠️ GraphQL errors in response:', data.errors);
      return NextResponse.json(data); // Return errors to client
    }

    console.log(`✅ Subgraph query successful (${endpointUsed}):`, {
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : [],
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('💥 Error proxying subgraph request:', error);
    
    // Try envio.dev as last resort if we haven't tried it yet
    try {
      console.log('🔄 Attempting envio.dev backup due to exception...');
      const envioHeaders = {
        'Content-Type': 'application/json',
      };
      const envioResponse = await fetch(ENVIO_METOKENS_SUBGRAPH_URL, {
        method: 'POST',
        headers: envioHeaders,
        body: JSON.stringify(body),
      });
      
      if (envioResponse.ok) {
        const envioData = await envioResponse.json();
        console.log('✅ Successfully recovered using envio.dev backup');
        return NextResponse.json(envioData);
      }
    } catch (envioError) {
      console.error('❌ Envio.dev backup also failed:', envioError);
    }
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check server logs for more details. Tried both Goldsky (Deployment ID: QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53) and envio.dev backup.',
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
