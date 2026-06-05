import { describe, expect, it } from 'vitest';
import { buildFeedNotFoundMessage, formatLensFeedPostError } from './lens-feed';

describe('lens-feed', () => {
  it('builds a feed-not-found message with network context', () => {
    const msg = buildFeedNotFoundMessage(
      '0xfa3059b8939f08cd40caf51f566252ec9fece73d',
      'mainnet',
    );
    expect(msg).toContain('Lens mainnet');
    expect(msg).toContain('app contract');
  });

  it('maps GraphQL feed errors to configuration guidance', () => {
    const msg = formatLensFeedPostError(
      new Error('[GraphQL] Bad user input - Params validation error: Feed does not exist'),
      '0xfa3059b8939f08cd40caf51f566252ec9fece73d',
      'mainnet',
    );
    expect(msg).toContain('not registered on Lens mainnet');
  });
});
