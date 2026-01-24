import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/utils/logger';
import { rateLimiters } from '@/lib/middleware/rateLimit';

// Reality.eth subgraph endpoint - using Goldsky
// Public URL: https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/reality-eth/1.0.0/gn
// Uses the same project as MeTokens subgraphs
// Set GOLDSKY_REALITY_ETH_PROJECT_ID environment variable to use a different project
const DEFAULT_PROJECT_ID = 'project_cmh0iv6s500dbw2p22vsxcfo6';
const PROJECT_ID = process.env.GOLDSKY_REALITY_ETH_PROJECT_ID || DEFAULT_PROJECT_ID;

const getSubgraphUrl = (subgraphName: string, version: string, specificAccessType?: 'public' | 'private') => {
  const isPrivate = !!process.env.GOLDSKY_API_KEY;
  const accessType = specificAccessType || (isPrivate ? 'private' : 'public');
  return `https://api.goldsky.com/api/${accessType}/${PROJECT_ID}/subgraphs/${subgraphName}/${version}/gn`;
};

const REALITY_ETH_SUBGRAPH_URL = getSubgraphUrl('reality-eth', '1.0.0');

export async function POST(request: NextRequest) {
  const rl = await rateLimiters.generous(request);
  if (rl) return rl;

  try {
    const body = await request.json();
    serverLogger.debug('Reality.eth subgraph proxy received request:', {
      query: body.query?.substring(0, 100) + '...',
      variables: body.variables,
    });

    // Determine endpoints
    const isPrivate = !!process.env.GOLDSKY_API_KEY;
    const privateEndpoint = getSubgraphUrl('reality-eth', '1.0.0', 'private');
    const publicEndpoint = getSubgraphUrl('reality-eth', '1.0.0', 'public');

    // Default to private if key exists, otherwise public
    let subgraphEndpoint = isPrivate ? privateEndpoint : publicEndpoint;
    serverLogger.debug(`Forwarding to Goldsky Reality.eth subgraph endpoint: ${subgraphEndpoint}`);

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
      serverLogger.warn(`Private endpoint returned ${response.status}, falling back to public endpoint...`);
      subgraphEndpoint = publicEndpoint;
      const publicHeaders = { ...headers };
      delete publicHeaders['Authorization'];

      response = await performFetch(subgraphEndpoint, publicHeaders);
    }

    serverLogger.debug('Reality.eth subgraph response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      serverLogger.error('Goldsky Reality.eth subgraph request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'Reality.eth Subgraph Query Failed',
          details: errorText,
          status: response.status,
          hint: response.status === 404
            ? 'Subgraph not found. Deploy the Reality.eth subgraph to Goldsky first.'
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
      serverLogger.error('GraphQL errors in response:', data.errors);
      return NextResponse.json(data);
    }

    serverLogger.debug('Reality.eth subgraph query successful:', {
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : [],
    });

    return NextResponse.json(data);

  } catch (error) {
    serverLogger.error('Error proxying Reality.eth subgraph request:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check server logs for more details. Ensure the Reality.eth subgraph is deployed to Goldsky.',
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
