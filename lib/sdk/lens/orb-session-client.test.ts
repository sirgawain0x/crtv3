import { describe, it, expect, vi, beforeEach } from 'vitest';

const resumeSessionMock = vi.fn().mockResolvedValue({
  isErr: () => false,
  value: { id: 'session' },
});

vi.mock('@lens-protocol/client', () => ({
  PublicClient: {
    create: vi.fn(() => ({
      resumeSession: resumeSessionMock,
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

import {
  clearLensSessionCache,
  resumeLensSessionFromOrb,
} from './orb-session-client';

describe('resumeLensSessionFromOrb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLensSessionCache();
    process.env.NEXT_PUBLIC_LENS_ENV = 'testnet';
  });

  it('throws when access token is missing', async () => {
    await expect(
      resumeLensSessionFromOrb({ accessToken: '' }),
    ).rejects.toThrow('missing an access token');
  });

  it('throws when refresh token is missing', async () => {
    await expect(
      resumeLensSessionFromOrb({ accessToken: 'orb-access-token' }),
    ).rejects.toThrow('missing a refresh token');
  });

  it('resumes session when tokens are present', async () => {
    const session = await resumeLensSessionFromOrb({
      accessToken: 'orb-access-token',
      refreshToken: 'refresh',
      idToken: 'id',
    });
    expect(session).toEqual({ id: 'session' });
  });

  it('reuses cached session for the same access token', async () => {
    const tokens = {
      accessToken: 'cached-token',
      refreshToken: 'refresh',
    };
    await resumeLensSessionFromOrb(tokens);
    await resumeLensSessionFromOrb(tokens);
    expect(resumeSessionMock).toHaveBeenCalledTimes(1);
  });
});
