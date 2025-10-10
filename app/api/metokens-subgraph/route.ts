import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config';

// MeTokens subgraph endpoint - using the correct URL format with query key in path
const getSubgraphEndpoint = (queryKey: string) => 
  `https://subgraph.satsuma-prod.com/${queryKey}/creative-organization-dao--378139/metokens/api`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Subgraph proxy received request:', {
      query: body.query?.substring(0, 100) + '...',
      variables: body.variables,
    });
    
    // Get the query key directly from environment variable
    const queryKey = process.env.SUBGRAPH_QUERY_KEY;
    
    if (!queryKey) {
      console.error('❌ SUBGRAPH_QUERY_KEY environment variable is not set');
      console.error('💡 Please set SUBGRAPH_QUERY_KEY in your environment variables');
      console.error('💡 You can get a query key from https://app.satsuma.xyz/');
      return NextResponse.json(
        { 
          error: 'Configuration Error',
          message: 'SUBGRAPH_QUERY_KEY environment variable is not set',
          hint: 'Please set SUBGRAPH_QUERY_KEY in your .env.local file. Get your key from https://app.satsuma.xyz/',
        },
        { status: 500 }
      );
    }

    console.log('✅ Query key available');

    // Construct the correct subgraph endpoint with query key in the path
    const subgraphEndpoint = getSubgraphEndpoint(queryKey);
    console.log('🔗 Forwarding to subgraph endpoint:', subgraphEndpoint.replace(queryKey, '***'));

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward the GraphQL request to the subgraph
    const response = await fetch(subgraphEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📊 Subgraph response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Subgraph request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      return NextResponse.json(
        { 
          error: 'Subgraph Query Failed', 
          details: errorText, 
          status: response.status,
          hint: response.status === 401 
            ? 'Authentication failed. Check if your SUBGRAPH_QUERY_KEY is valid.'
            : response.status === 404
            ? 'Subgraph not found. Verify the subgraph name and deployment.'
            : 'Subgraph server error. The subgraph may be down or experiencing issues.',
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
    
    console.log('✅ Subgraph query successful:', {
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : [],
    });
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('💥 Error proxying subgraph request:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check server logs for more details',
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
