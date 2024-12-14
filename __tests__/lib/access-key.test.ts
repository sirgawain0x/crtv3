import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAccessKey, validateAccessKey } from '@app/lib/access-key';
import crypto from 'node:crypto';

// Mock crypto module
vi.mock('crypto', () => ({
  default: {
    createHmac: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mocked-hash'),
    }),
    timingSafeEqual: vi.fn(),
  },
}));

describe('Access Key Utils', () => {
  const mockContext = {
    creatorAddress: '0x456',
    tokenId: '1',
    contractAddress: '0x789',
    chain: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ACCESS_KEY_SECRET = 'test-access-key';
  });

  describe('generateAccessKey', () => {
    it('should generate an access key using HMAC', () => {
      const address = '0x123';
      const result = generateAccessKey(address, mockContext);

      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'test-access-key');
      expect(result).toBe('mocked-hash');
    });
    
    it('should throw error if ACCESS_KEY_SECRET env variable is not set', () => {
      process.env.ACCESS_KEY_SECRET = '';
      const address = '0x123';

      expect(() => generateAccessKey(address, mockContext)).toThrow('No secret provided');
    });
  });

  describe('validateAccessKey', () => {
    it('should return true for valid access key', () => {
      const address = '0x123';
      const accessKey = 'f1eebd4b32d7493fd92844910340e4375bf68f434d5eb3921fc4b994aef5fdb8';

      vi.mocked(crypto.timingSafeEqual).mockReturnValue(true);

      const result = validateAccessKey(accessKey, address, mockContext);

      expect(result).toBe(true);
      expect(crypto.timingSafeEqual).toHaveBeenCalled();
    });

    it('should return false for invalid access key', () => {
      const address = '0x123';
      const accessKey = 'inf1eebd4b32d7493fd92844910340e4375bf68f434d5eb3921fc4b994aef5fdb8';

      vi.mocked(crypto.timingSafeEqual).mockReturnValue(false);

      const result = validateAccessKey(accessKey, address, mockContext);

      expect(result).toBe(false);
      expect(crypto.timingSafeEqual).toHaveBeenCalled();
    });
  });

  it('should use timing-safe comparison', () => {
    const address = '0x123';
    const accessKey = 'test-key';
    
    validateAccessKey(accessKey, address, mockContext);
    
    expect(crypto.timingSafeEqual).toHaveBeenCalled();
    expect(crypto.createHmac).toHaveBeenCalledBefore(crypto.timingSafeEqual as any);
  });
});