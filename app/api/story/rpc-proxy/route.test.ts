import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const access = vi.hoisted(() => vi.fn());
vi.mock('@/lib/middleware/platformApiAccess', () => ({ requirePlatformApiAccess: access }));
import { POST } from './route';
beforeEach(() => { access.mockResolvedValue({ allowed: true, tier: 'internal' }); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
const rpc = (body: unknown) => new NextRequest('https://tv.creativeplatform.xyz/api/story/rpc-proxy', { method: 'POST', body: JSON.stringify(body) });
describe('Story RPC cost boundary', () => {
  it('requires access before any upstream RPC', async () => {
    access.mockResolvedValue({ allowed: false, response: NextResponse.json({}, { status: 402 }) });
    expect((await POST(rpc({ method: 'eth_chainId', params: [] }))).status).toBe(402);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['debug_traceTransaction', 'alchemy_requestGasAndPaymasterAndData', 'eth_getLogs'])('blocks costly or sponsorship method %s', async (method) => {
    expect((await POST(rpc({ method, params: [] }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects batch requests and oversized calls', async () => {
    expect((await POST(rpc([{ method: 'eth_chainId', params: [] }]))).status).toBe(400);
    expect((await POST(rpc({ method: 'eth_call', params: ['a'.repeat(65_536)] }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});
