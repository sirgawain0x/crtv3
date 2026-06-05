import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resetAppSession } from '@/lib/auth/session-recovery';

describe('resetAppSession', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('window', {
      location: { assign: vi.fn() },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('calls orb and wallet logout then redirects home', async () => {
    const walletLogout = vi.fn().mockResolvedValue(undefined);
    const orbLogout = vi.fn().mockResolvedValue(undefined);

    await resetAppSession({ walletLogout, orbLogout });

    expect(orbLogout).toHaveBeenCalledOnce();
    expect(walletLogout).toHaveBeenCalledOnce();
    expect(window.location.assign).toHaveBeenCalledWith('/');
  });

  it('still clears wallet when orb logout throws', async () => {
    const walletLogout = vi.fn().mockResolvedValue(undefined);
    const orbLogout = vi.fn().mockRejectedValue(new Error('orb fail'));

    await resetAppSession({ walletLogout, orbLogout });

    expect(walletLogout).toHaveBeenCalledOnce();
    expect(window.location.assign).toHaveBeenCalledWith('/');
  });
});
