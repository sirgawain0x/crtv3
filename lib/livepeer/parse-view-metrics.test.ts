import { describe, expect, it } from 'vitest';
import {
  hasLivepeerErrors,
  parseLivepeerViewMetricsBody,
} from './parse-view-metrics';

describe('parseLivepeerViewMetricsBody', () => {
  it('parses a single object response', () => {
    expect(
      parseLivepeerViewMetricsBody(
        {
          playbackId: 'p1',
          viewCount: 12,
          playtimeMins: 34,
          legacyViewCount: 5,
        },
        'p1',
      ),
    ).toEqual({
      playbackId: 'p1',
      viewCount: 12,
      playtimeMins: 34,
      legacyViewCount: 5,
    });
  });

  it('sums metrics when Livepeer returns an array', () => {
    expect(
      parseLivepeerViewMetricsBody(
        [
          { viewCount: 8, playtimeMins: 10 },
          { viewCount: 4, playtimeMins: 6, legacyViewCount: 2 },
        ],
        'p1',
      ),
    ).toEqual({
      playbackId: 'p1',
      viewCount: 12,
      playtimeMins: 16,
      legacyViewCount: 2,
    });
  });

  it('returns zero metrics for an empty array', () => {
    expect(parseLivepeerViewMetricsBody([], 'p1')).toEqual({
      playbackId: 'p1',
      viewCount: 0,
      playtimeMins: 0,
      legacyViewCount: 0,
    });
  });

  it('unwraps SDK-style data payloads', () => {
    expect(
      parseLivepeerViewMetricsBody(
        { data: { playbackId: 'p1', viewCount: 9, playtimeMins: 1 } },
        'p1',
      ),
    ).toEqual({
      playbackId: 'p1',
      viewCount: 9,
      playtimeMins: 1,
      legacyViewCount: 0,
    });
  });

  it('returns null for Livepeer error payloads', () => {
    expect(
      parseLivepeerViewMetricsBody({ errors: [['id not provided']] }, 'p1'),
    ).toBeNull();
    expect(hasLivepeerErrors({ errors: ['no token found'] })).toBe(true);
  });
});
