import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config';

// MeTokens subgraph endpoint - using the correct URL format with query key in path
const getSubgraphEndpoint = (queryKey: string) => 
  `https://subgraph.satsuma-prod.com/${queryKey}/creative-organization-dao--378139/metokens/api`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    // Get the query key directly from environment variable
    const queryKey = process.env.SUBGRAPH_QUERY_KEY;
    console.log('Query key available:', !!queryKey);
    
    if (!queryKey) {
      console.error('SUBGRAPH_QUERY_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'SUBGRAPH_QUERY_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Construct the correct subgraph endpoint with query key in the path
    const subgraphEndpoint = getSubgraphEndpoint(queryKey);
    console.log('Subgraph endpoint:', subgraphEndpoint);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    console.log('Making request to subgraph...');
    
    // Forward the GraphQL request to the subgraph
    const response = await fetch(subgraphEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('Subgraph response status:', response.status);
    console.log('Subgraph response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Subgraph request failed:', response.status, errorText);
      return NextResponse.json(
        { error: 'Subgraph request failed', details: errorText, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Subgraph response data:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying subgraph request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
