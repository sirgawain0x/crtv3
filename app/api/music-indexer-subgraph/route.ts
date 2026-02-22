import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/utils/logger';
import { rateLimiters } from '@/lib/middleware/rateLimit';

const DEFAULT_PROJECT_ID = 'project_cmh0iv6s500dbw2p22vsxcfo6';
const PROJECT_ID = process.env.GOLDSKY_MUSIC_INDEXER_PROJECT_ID || process.env.GOLDSKY_PROJECT_ID || DEFAULT_PROJECT_ID;
const SUBGRAPH_NAME = process.env.GOLDSKY_MUSIC_INDEXER_SUBGRAPH_NAME || 'music-eth';
const SUBGRAPH_VERSION = process.env.GOLDSKY_MUSIC_INDEXER_SUBGRAPH_VERSION || '1.0.0';

const getSubgraphUrl = (name: string, version: string, access?: 'public' | 'private') => {
  const isPrivate = !!process.env.GOLDSKY_API_KEY;
  const type = access ?? (isPrivate ? 'private' : 'public');
  return `https://api.goldsky.com/api/${type}/${PROJECT_ID}/subgraphs/${name}/${version}/gn`;
};

export async function POST(request: NextRequest) {
  const rl = await rateLimiters.generous(request);
  if (rl) return rl;

  try {
    const body = await request.json();
    serverLogger.debug('Music indexer subgraph proxy received request:', { query: body.query?.substring(0, 100) });

    const isPrivate = !!process.env.GOLDSKY_API_KEY;
    let url = getSubgraphUrl(SUBGRAPH_NAME, SUBGRAPH_VERSION, isPrivate ? 'private' : 'public');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isPrivate && process.env.GOLDSKY_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.GOLDSKY_API_KEY}`;
    }

    let response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (isPrivate && (response.status === 404 || response.status >= 500)) {
      url = getSubgraphUrl(SUBGRAPH_NAME, SUBGRAPH_VERSION, 'public');
      const { Authorization: _, ...publicHeaders } = headers;
      response = await fetch(url, { method: 'POST', headers: publicHeaders, body: JSON.stringify(body) });
    }

    if (!response.ok) {
      const text = await response.text();
      serverLogger.error('Music indexer subgraph request failed:', { status: response.status, error: text });
      return NextResponse.json(
        {
          error: 'Music Indexer Subgraph Query Failed',
          details: text,
          status: response.status,
          hint: response.status === 404 ? 'Deploy music indexer subgraph to Goldsky (music-eth/1.0.0 or merged).' : response.status === 429 ? 'Rate limit exceeded.' : 'Subgraph server error.',
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (data.errors?.length) serverLogger.error('GraphQL errors:', data.errors);
    return NextResponse.json(data);
  } catch (error) {
    serverLogger.error('Error proxying music indexer subgraph:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-api-key' },
  });
}
