import { NextRequest, NextResponse } from 'next/server';

// MeTokens subgraph endpoint - now using Goldsky
// Deployment ID: QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53
const DEFAULT_PROJECT_ID = 'project_cmh0iv6s500dbw2p22vsxcfo6';
const PROJECT_ID = process.env.GOLDSKY_PROJECT_ID || DEFAULT_PROJECT_ID;

const getSubgraphUrl = (subgraphName: string, version: string, specificAccessType?: 'public' | 'private') => {
  const isPrivate = !!process.env.GOLDSKY_API_KEY;
  const accessType = specificAccessType || (isPrivate ? 'private' : 'public');
  return `https://api.goldsky.com/api/${accessType}/${PROJECT_ID}/subgraphs/${subgraphName}/${version}/gn`;
};

const METOKENS_SUBGRAPH_URL = getSubgraphUrl('metokens', 'v0.0.1');

// Creative TV subgraph endpoint - now using Goldsky
// Deployment ID: QmbDp8Wfy82g8L7Mv6RCAZHRcYUQB4prQfqchvexfZR8yZ
const CREATIVE_TV_SUBGRAPH_URL = getSubgraphUrl('creative_tv', '0.1');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Fallback logic: If private endpoint fails with 404 (not enabled), try public
    if (isPrivate && response.status === 404) {
      console.warn('⚠️ Private endpoint returned 404, falling back to public endpoint...');
      subgraphEndpoint = publicEndpoint;
      // Remove auth header for public request (optional, but cleaner)
      const publicHeaders = { ...headers };
      delete publicHeaders['Authorization'];

      response = await performFetch(subgraphEndpoint, publicHeaders);
    }

    console.log('📊 Subgraph response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Goldsky subgraph request failed:', {
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
              : 'Subgraph server error. The Goldsky subgraph may be down or experiencing issues.',
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

    console.log('✅ Goldsky subgraph query successful:', {
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : [],
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('💥 Error proxying Goldsky subgraph request:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check server logs for more details. Deployment ID: QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53',
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
