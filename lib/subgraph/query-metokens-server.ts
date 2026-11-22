import 'server-only';
import {
  buildSubgraphRequestHeaders,
  isGraphQlResponseSuccessful,
  resolveSubgraphEndpoints,
} from './creative-platform-proxy';

/** Server work already admitted by an API guard must not re-enter a paid HTTP route. */
export async function queryMetokensServer(
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  for (const endpoint of resolveSubgraphEndpoints('metokens')) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildSubgraphRequestHeaders(endpoint),
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) continue;
      const payload: unknown = await response.json();
      if (isGraphQlResponseSuccessful(payload)) {
        return (payload as { data: Record<string, unknown> }).data;
      }
    } catch {
      // Try only the configured upstreams. Do not expose provider errors or keys.
    }
  }
  return null;
}
