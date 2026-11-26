import { describe, expect, it } from 'vitest';
import { isVideoAssetId } from './asset-id';

describe('provider asset IDs', () => {
  it.each(['550e8400-e29b-41d4-a716-446655440000', 'a'.repeat(64), 'vod_hash-123'])('accepts %s', id => {
    expect(isVideoAssetId(id)).toBe(true);
  });
  it.each(['', '../secret', 'https://example.com/video', 'id,asset_id.eq.other', 'a'.repeat(201), 'a b', null])('rejects unsafe or unbounded input %s', id => {
    expect(isVideoAssetId(id)).toBe(false);
  });
});
