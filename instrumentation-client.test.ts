import { afterEach, expect, it, vi } from 'vitest';
import { BOTID_DEEP_ANALYSIS_OPTIONS } from '@/lib/middleware/botIdGuard';

const { initBotId } = vi.hoisted(() => ({ initBotId: vi.fn() }));
vi.mock('botid/client/core', () => ({ initBotId }));
vi.mock('@/lib/predictions/reality-localstorage-security', () => ({
  runRealityLocalStorageSecurityMigration: vi.fn(),
}));

afterEach(() => {
  delete (globalThis as typeof globalThis & { __crtvBotIdInit?: boolean }).__crtvBotIdInit;
  vi.clearAllMocks();
});

it('attaches matching BotID proof to the clip catalog confirmation request', async () => {
  await import('./instrumentation-client');
  const routes = initBotId.mock.calls[0][0].protect;
  expect(routes.filter((route: { path: string; method: string }) =>
    route.path === '/api/video-assets/clips' && route.method === 'POST',
  )).toEqual([{
    path: '/api/video-assets/clips', method: 'POST',
    ...BOTID_DEEP_ANALYSIS_OPTIONS,
  }]);
});
