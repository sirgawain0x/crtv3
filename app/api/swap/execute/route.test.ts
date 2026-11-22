import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
const execute = vi.hoisted(() => vi.fn());
vi.mock('@/lib/sdk/alchemy/swap-client', () => ({ executeSwap: execute }));
import { POST } from './route';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('server wallet spending boundary', () => {
  it('does not execute swaps by default', async () => {
    vi.stubEnv('ALCHEMY_SERVER_SWAPS_ENABLED', 'false');
    expect((await POST(new NextRequest('https://tv.creativeplatform.xyz/api/swap/execute', { method: 'POST' }))).status).toBe(503);
    expect(execute).not.toHaveBeenCalled();
  });
  it('does not let a public caller spend the server wallet when enabled', async () => {
    vi.stubEnv('ALCHEMY_SERVER_SWAPS_ENABLED', 'true');
    expect((await POST(new NextRequest('https://tv.creativeplatform.xyz/api/swap/execute', { method: 'POST' }))).status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });
});
