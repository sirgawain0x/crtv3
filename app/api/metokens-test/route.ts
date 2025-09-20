import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config/index';

export async function GET() {
  try {
    // Check if the environment variable is available
    const hasQueryKey = !!config.subgraphQueryKey;
    const queryKeyLength = config.subgraphQueryKey?.length || 0;
    
    // Debug information
    const envVar = process.env.SUBGRAPH_QUERY_KEY;
    const hasEnvVar = !!envVar;
    const envVarLength = envVar?.length || 0;
    
    return NextResponse.json({
      hasQueryKey,
      queryKeyLength,
      queryKeyPreview: hasQueryKey ? `${config.subgraphQueryKey?.slice(0, 8)}...` : null,
      hasEnvVar,
      envVarLength,
      envVarPreview: hasEnvVar ? `${envVar?.slice(0, 8)}...` : null,
      message: hasQueryKey ? 'Query key is available' : 'Query key is missing'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check config', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
