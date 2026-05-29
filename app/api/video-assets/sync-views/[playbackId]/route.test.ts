import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetchAllViews = vi.fn();
const mockSyncStoredViewsCount = vi.fn();
const mockGetStoredViewsCount = vi.fn();
const mockCreateServiceClient = vi.fn();

vi.mock('botid/server', () => ({
  checkBotId: vi.fn(async () => ({ isBot: false })),
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimiters: {
    standard: vi.fn(async () => null),
  },
}));

vi.mock('@/app/api/livepeer/views', () => ({
  fetchAllViews: (...args: unknown[]) => mockFetchAllViews(...args),
}));

vi.mock('@/lib/livepeer/sync-view-count', () => ({
  syncStoredViewsCount: (...args: unknown[]) => mockSyncStoredViewsCount(...args),
  getStoredViewsCount: (...args: unknown[]) => mockGetStoredViewsCount(...args),
}));

vi.mock('@/lib/sdk/supabase/service', () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

vi.mock('@/lib/utils/logger', () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from './route';

describe('sync-views POST security', () => {
  beforeEach(() => {
    mockCreateServiceClient.mockReturnValue({});
    mockFetchAllViews.mockResolvedValue({
      ok: true,
      metrics: {
        playbackId: 'playback-1',
        viewCount: 12,
        playtimeMins: 0,
        legacyViewCount: 5,
      },
    });
    mockSyncStoredViewsCount.mockResolvedValue({ viewCount: 17, updated: true });
    mockGetStoredViewsCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ignores spoofed viewCount in body and uses Livepeer metrics', async () => {
    const request = new NextRequest(
      'http://localhost/api/video-assets/sync-views/playback-1',
      {
        method: 'POST',
        body: JSON.stringify({ viewCount: 1_000_000 }),
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ playbackId: 'playback-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      playbackId: 'playback-1',
      viewCount: 17,
      livepeerSynced: true,
    });
    expect(mockFetchAllViews).toHaveBeenCalledWith('playback-1');
    expect(mockSyncStoredViewsCount).toHaveBeenCalledWith(
      {},
      'playback-1',
      17,
    );
  });

  it('returns stored view count when Livepeer auth fails', async () => {
    mockFetchAllViews.mockResolvedValue({
      ok: false,
      reason: 'upstream_error',
      status: 401,
    });
    mockGetStoredViewsCount.mockResolvedValue(42);

    const request = new NextRequest(
      'http://localhost/api/video-assets/sync-views/playback-1',
      { method: 'GET' },
    );

    const response = await GET(request, {
      params: Promise.resolve({ playbackId: 'playback-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      playbackId: 'playback-1',
      viewCount: 42,
      livepeerSynced: false,
      code: 'LIVEPEER_VIEWS_UNAVAILABLE',
    });
  });

  it('returns stored view count when Livepeer metrics are unavailable', async () => {
    mockFetchAllViews.mockResolvedValue({
      ok: false,
      reason: 'upstream_error',
      status: 500,
    });
    mockGetStoredViewsCount.mockResolvedValue(42);

    const request = new NextRequest(
      'http://localhost/api/video-assets/sync-views/playback-1',
      { method: 'GET' },
    );

    const response = await GET(request, {
      params: Promise.resolve({ playbackId: 'playback-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      playbackId: 'playback-1',
      viewCount: 42,
      livepeerSynced: false,
      code: 'LIVEPEER_VIEWS_UNAVAILABLE',
    });
    expect(mockSyncStoredViewsCount).not.toHaveBeenCalled();
  });
});
