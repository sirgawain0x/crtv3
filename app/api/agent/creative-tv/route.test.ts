import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const OWNER = '0xcccccccccccccccccccccccccccccccccccccccc';

const mockRequireWalletAuth = vi.fn();

vi.mock('@/lib/middleware/botIdGuard', () => ({
  checkBotIdDeep: vi.fn(async () => ({ isBot: false })),
  requireHumanOrVerifiedBot: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimiters: {
    standard: vi.fn(async () => null),
  },
}));

vi.mock('@/lib/auth/require-wallet', () => ({
  requireWalletAuth: (...args: unknown[]) => mockRequireWalletAuth(...args),
}));

vi.mock('@/lib/utils/logger', () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { POST } from './route';

function creativeTvRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/agent/creative-tv', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': OWNER,
      'X-Wallet-Timestamp': '1',
      'X-Wallet-Signature': '0xabc',
    },
  });
}

describe('creative-tv POST', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireWalletAuth.mockResolvedValue({ address: OWNER });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('returns 503 when HERMES_GATEWAY_API_KEY is unset', async () => {
    vi.stubEnv('HERMES_GATEWAY_API_KEY', '');
    const res = await POST(
      creativeTvRequest({ task: 'show_notes', title: 'Base Creators Ep. 12' }),
    );
    expect(res.status).toBe(503);
  });

  it('returns 400 when neither messages nor video metadata is provided', async () => {
    vi.stubEnv('HERMES_GATEWAY_API_KEY', 'hermes-test-key');
    const res = await POST(creativeTvRequest({ task: 'curation' }));
    expect(res.status).toBe(400);
  });

  it('routes show_notes workflows to the authenticated gateway Creative TV route', async () => {
    vi.stubEnv('HERMES_GATEWAY_API_KEY', 'hermes-test-key');
    vi.stubEnv('HERMES_X402_GATEWAY_URL', 'https://gateway.example.com');

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: 'creative-tv',
          choices: [{ message: { content: '00:00 Intro\n01:30 Minting MeTokens' } }],
          usage: { total_tokens: 42 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await POST(
      creativeTvRequest({
        task: 'show_notes',
        title: 'Base Creators Ep. 12',
        transcript: 'Today we cover MeTokens on Creative TV.',
      }),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      model: string;
      task: string;
      content: string;
    };
    expect(data.ok).toBe(true);
    expect(data.model).toBe('creative-tv');
    expect(data.task).toBe('show_notes');
    expect(data.content).toContain('Minting MeTokens');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://gateway.example.com/v1/internal/creative-tv');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer hermes-test-key');
    expect(JSON.parse(String(init.body)).model).toBeUndefined();
  });
});
