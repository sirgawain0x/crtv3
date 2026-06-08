import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { serverLogger } from '@/lib/utils/logger';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import {
  buildSubgraphRequestHeaders,
  formatGraphQlErrors,
  getSubgraphProviderMode,
  GOLDSKY_ROLLBACK_HINT,
  isGraphQlResponseSuccessful,
  resolveSubgraphEndpoints,
  STUDIO_URL_HINT,
} from '@/lib/subgraph/creative-platform-proxy';

export async function POST(request: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  const rl = await rateLimiters.generous(request);
  if (rl) return rl;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid Request Body',
        message: 'Failed to parse request body as JSON',
      },
      { status: 400 },
    );
  }

  try {
    serverLogger.debug('Subgraph proxy received request:', {
      query: (body as { query?: string }).query?.substring(0, 100) + '...',
      variables: (body as { variables?: unknown }).variables,
      providerMode: getSubgraphProviderMode(),
    });

    const candidateEndpoints = resolveSubgraphEndpoints('metokens');

    if (candidateEndpoints.length === 0) {
      return NextResponse.json(
        {
          error: 'MeTokens Subgraph Not Configured',
          hint: STUDIO_URL_HINT,
        },
        { status: 503 },
      );
    }

    let lastHttpError: { status: number; details: string; endpoint: string } | null = null;
    let lastGraphQlError: { message: string; endpoint: string } | null = null;

    for (const endpoint of candidateEndpoints) {
      const headers = buildSubgraphRequestHeaders(endpoint);
      serverLogger.debug(`Forwarding MeTokens query to endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastHttpError = { status: response.status, details: errorText, endpoint };
        serverLogger.error('MeTokens subgraph HTTP error:', lastHttpError);
        continue;
      }

      const data = await response.json();

      if (!isGraphQlResponseSuccessful(data)) {
        const message = formatGraphQlErrors(data.errors ?? []);
        lastGraphQlError = { message, endpoint };
        serverLogger.error('MeTokens subgraph GraphQL error:', { endpoint, message });
        continue;
      }

      serverLogger.debug('Subgraph query successful:', {
        endpoint,
        dataKeys: data.data ? Object.keys(data.data) : [],
      });

      return NextResponse.json(data);
    }

    if (lastGraphQlError) {
      const isDeploymentMissing = lastGraphQlError.message.toLowerCase().includes('does not exist');
      return NextResponse.json(
        {
          errors: [{ message: lastGraphQlError.message }],
          hint: isDeploymentMissing
            ? `${STUDIO_URL_HINT} ${GOLDSKY_ROLLBACK_HINT}`
            : 'Subgraph query failed. Verify Graph Studio deployment is synced.',
        },
        { status: 502 },
      );
    }

    if (lastHttpError) {
      return NextResponse.json(
        {
          error: 'Subgraph Query Failed',
          details: lastHttpError.details,
          status: lastHttpError.status,
          hint:
            lastHttpError.status === 404
              ? STUDIO_URL_HINT
              : lastHttpError.status === 429
                ? 'Rate limit exceeded. Please try again later.'
                : 'Subgraph server error.',
        },
        { status: lastHttpError.status },
      );
    }

    return NextResponse.json(
      { error: 'No subgraph endpoint available', hint: STUDIO_URL_HINT },
      { status: 503 },
    );
  } catch (error) {
    serverLogger.error('Error proxying subgraph request:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: STUDIO_URL_HINT,
      },
      { status: 500 },
    );
  }
}

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
