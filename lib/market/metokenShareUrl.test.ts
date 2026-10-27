import { describe, expect, it } from 'vitest';
import { buildMeTokenSharePath, buildMeTokenShareUrl } from './metokenShareUrl';

describe('buildMeTokenSharePath', () => {
  it('uses creator owner address for creator shares, not MeToken contract', () => {
    const owner = '0x365e9d11f0431b434770c3e0bc34f01af315b0bf';
    const meTokenContract = '0x1a37f7d9589e427ac2b0114f3265c1bd0bc02e85';

    expect(
      buildMeTokenSharePath({
        type: 'creator',
        creatorOwnerAddress: owner,
      })
    ).toBe(`/creator/${owner}`);

    expect(
      buildMeTokenSharePath({
        type: 'creator',
        creatorOwnerAddress: meTokenContract,
      })
    ).not.toBe(`/creator/${owner}`);
  });

  it('builds watch URLs for content shares', () => {
    expect(
      buildMeTokenSharePath({
        type: 'content',
        playbackId: 'abc123',
      })
    ).toBe('/watch/abc123');
  });

  it('falls back to /market when creator owner address is missing', () => {
    expect(
      buildMeTokenSharePath({
        type: 'creator',
      })
    ).toBe('/market');

    expect(
      buildMeTokenShareUrl('https://tv.creativeplatform.xyz', {
        type: 'creator',
      })
    ).toBe('https://tv.creativeplatform.xyz/market');
  });

  it('falls back to /market for content shares without playbackId', () => {
    expect(
      buildMeTokenSharePath({
        type: 'content',
      })
    ).toBe('/market');
  });
});

describe('buildMeTokenShareUrl', () => {
  it('returns absolute URL with site origin', () => {
    const owner = '0x365e9d11f0431b434770c3e0bc34f01af315b0bf';
    expect(
      buildMeTokenShareUrl('https://tv.creativeplatform.xyz', {
        type: 'creator',
        creatorOwnerAddress: owner,
      })
    ).toBe(
      `https://tv.creativeplatform.xyz/creator/${owner}`
    );
  });
});
