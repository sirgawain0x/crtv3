import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllViews } from './views';
import {
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from '@/lib/sdk/livepeer/studioAuth';

vi.mock('@/lib/sdk/livepeer/fullClient', () => ({
  getFullLivepeer: vi.fn(() => null),
}));

describe('Livepeer view metrics helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('prefers the full Livepeer API key', () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'full-key');
    vi.stubEnv('LIVEPEER_API_KEY', 'standard-key');

    expect(resolveLivepeerStudioAuthToken()).toBe('full-key');
  });

  it('strips surrounding quotes from Livepeer API keys', () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', '"quoted-full-key"');
    vi.stubEnv('LIVEPEER_API_KEY', '');

    expect(resolveLivepeerStudioAuthToken()).toBe('quoted-full-key');
  });

  it('normalizes the Studio API base URL', () => {
    vi.stubEnv('LIVEPEER_FULL_API_URL', 'https://livepeer.example/');

    expect(livepeerStudioApiBaseUrl()).toBe('https://livepeer.example');
  });

  it('fetches view metrics without using cache (single object response)', async () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'full-key');
    const fetchMock = vi.fn(async () =>
      Response.json({
        playbackId: 'playback-1',
        viewCount: 12,
        playtimeMins: 34,
        legacyViewCount: 5,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllViews('playback-1')).resolves.toEqual({
      ok: true,
      metrics: {
        playbackId: 'playback-1',
        viewCount: 12,
        playtimeMins: 34,
        legacyViewCount: 5,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://livepeer.studio/api/data/views/query/total/playback-1',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.any(Headers),
      }),
    );
  });

  it('fetches view metrics correctly when Livepeer responds with an array (standard Livepeer response)', async () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'full-key');
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          playbackId: 'playback-1',
          viewCount: 12,
          playtimeMins: 34,
          legacyViewCount: 5,
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllViews('playback-1')).resolves.toEqual({
      ok: true,
      metrics: {
        playbackId: 'playback-1',
        viewCount: 12,
        playtimeMins: 34,
        legacyViewCount: 5,
      },
    });
  });

  it('falls back to viewership query when total endpoint returns zero views', async () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'full-key');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/query/total/')) {
        return Response.json({ playbackId: 'playback-1', viewCount: 0, playtimeMins: 0 });
      }
      if (url.includes('/query?')) {
        return Response.json([
          { playbackId: 'playback-1', viewCount: 3, playtimeMins: 1.5 },
        ]);
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllViews('playback-1')).resolves.toEqual({
      ok: true,
      metrics: {
        playbackId: 'playback-1',
        viewCount: 3,
        playtimeMins: 1.5,
        legacyViewCount: 0,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns upstream_error when Livepeer responds with errors in JSON body', async () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'full-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ errors: [['id not provided', 'Account not found']] }),
      ),
    );

    await expect(fetchAllViews('playback-1')).resolves.toEqual({
      ok: false,
      reason: 'upstream_error',
      status: 200,
    });
  });

  it('returns upstream_error when Livepeer responds with 500', async () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'full-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500, statusText: 'Internal Server Error' })),
    );

    await expect(fetchAllViews('playback-1')).resolves.toEqual({
      ok: false,
      reason: 'upstream_error',
      status: 500,
    });
  });

  it('returns not_configured when no API key is set', async () => {
    vi.stubEnv('LIVEPEER_FULL_API_KEY', '');
    vi.stubEnv('LIVEPEER_API_KEY', '');

    await expect(fetchAllViews('playback-1')).resolves.toEqual({
      ok: false,
      reason: 'not_configured',
    });
  });
});
