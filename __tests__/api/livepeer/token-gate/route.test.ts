import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@app/api/livepeer/token-gate/route';
import { generateAccessKey } from '@app/lib/access-key';
import * as auth from '@app/api/auth/thirdweb/authentication';
import * as thirdweb from 'thirdweb';

vi.mock('@app/lib/access-key');
vi.mock('@app/api/auth/thirdweb/authentication');
vi.mock('thirdweb', async () => {
  const actual = await vi.importActual('thirdweb');
  return {
    ...actual,
    getContract: vi.fn(),
  };
});
vi.mock('thirdweb/extensions/erc1155', async () => {
  const actual = await vi.importActual('thirdweb');
  return {
    ...actual,
    balanceOf: vi.fn(),
  };
})

describe('Token Gate Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST endpoint', () => {
    it('should return 400 if required fields are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/livepeer/token-gate', {
        method: 'POST',
        body: JSON.stringify({
          accessKey: 'test-key',
          context: {},
          timestamp: Date.now(),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.allowed).toBe(false);
      expect(data.message).toContain('missing required fields');
    });

    it('should validate access successfully', async () => {
      vi.mocked(auth.getJwtContext).mockResolvedValue({ address: '0x123' });
      vi.mocked(generateAccessKey).mockReturnValue('test-key');
      vi.mocked(balanceOf).mockResolvedValue(1n);

      const req = new NextRequest('http://localhost:3000/api/livepeer/token-gate', {
        method: 'POST',
        body: JSON.stringify({
          accessKey: 'test-key',
          context: {
            creatorAddress: '0x456',
            tokenId: '1',
            contractAddress: '0x789',
            chain: 1,
          },
          timestamp: Date.now(),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(true);
    });
  });

  describe('GET endpoint', () => {
    it('should return 400 if address is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/livepeer/token-gate?tokenId=1');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.allowed).toBe(false);
    });

    it('should generate access key successfully', async () => {
      vi.mocked(generateAccessKey).mockReturnValue('test-key');

      const req = new NextRequest('http://localhost?address=0x123&creatorAddress=0x456&tokenId=1&contractAddress=0x789&chain=1');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(true);
      expect(data.accessKey).toBe('test-key');
    });
  });
});