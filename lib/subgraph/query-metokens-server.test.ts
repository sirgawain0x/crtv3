import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ endpoints: vi.fn(() => ['https://indexer.example/graphql']) }));
vi.mock('./creative-platform-proxy', () => ({
  resolveSubgraphEndpoints: mocks.endpoints,
  buildSubgraphRequestHeaders: () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer test-indexer-key' }),
  isGraphQlResponseSuccessful: (payload: { data?: unknown; errors?: unknown[] }) => Boolean(payload?.data && !payload.errors?.length),
}));
import { queryMetokensServer } from './query-metokens-server';
afterEach(() => { vi.unstubAllGlobals(); mocks.endpoints.mockReset().mockReturnValue(['https://indexer.example/graphql']); });
describe('admitted market server queries', () => {
  it('uses configured upstream authentication without calling the paid app route again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { subscribes: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await queryMetokensServer('query { subscribes { id } }', { first: 50 })).toEqual({ subscribes: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('https://indexer.example/graphql', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-indexer-key' }),
      signal: expect.any(AbortSignal),
    }));
  });
  it('bounds failover to the configured upstreams and rejects GraphQL errors', async () => {
    mocks.endpoints.mockReturnValue(['https://first.example/graphql', 'https://second.example/graphql']);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ errors: [{ message: 'unavailable' }] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await queryMetokensServer('query { subscribes { id } }', {})).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not make network requests when no upstream is configured', async () => {
    mocks.endpoints.mockReturnValue([]);
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await queryMetokensServer('query { subscribes { id } }', {})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
