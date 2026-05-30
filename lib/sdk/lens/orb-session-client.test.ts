import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@lens-protocol/client', () => ({
  PublicClient: {
    create: vi.fn(() => ({
      resumeSession: vi.fn().mockResolvedValue({ isErr: () => false, value: { id: 'session' } }),
    })),
  },
  mainnet: { name: 'mainnet' },
  testnet: { name: 'testnet' },
}));

vi.mock('@lens-protocol/storage', () => ({
  InMemoryStorageProvider: vi.fn(),
  CredentialsStorage: {
    from: vi.fn(() => ({
      set: vi.fn().mockResolvedValue({ isErr: () => false }),
    })),
  },
}));

import { resumeLensSessionFromOrb } from './orb-session-client';

describe('resumeLensSessionFromOrb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_LENS_ENV = 'testnet';
  });

  it('throws when access token is missing', async () => {
    await expect(
      resumeLensSessionFromOrb({ accessToken: '' }),
    ).rejects.toThrow('missing an access token');
  });

  it('resumes session when tokens are present', async () => {
    const session = await resumeLensSessionFromOrb({
      accessToken: 'orb-access-token',
      refreshToken: 'refresh',
      idToken: 'id',
    });
    expect(session).toEqual({ id: 'session' });
  });
});
