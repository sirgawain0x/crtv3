/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LivepeerTextToImageEntry } from '@/components/Videos/LivepeerTextToImageEntry';
import { LivepeerAiFeatureProvider } from '@/context/LivepeerAiFeatureContext';

describe('LivepeerTextToImageEntry', () => {
  it('shows coming soon when text-to-image flag is off', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: true, textToImageEnabled: false }}
      >
        <LivepeerTextToImageEntry />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toContain('Text-to-image coming soon');
  });

  it('renders nothing when text-to-image flag is on', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: false, textToImageEnabled: true }}
      >
        <LivepeerTextToImageEntry />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toBe('');
  });
});
