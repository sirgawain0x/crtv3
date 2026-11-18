/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UploadCaptionsNotice } from '@/components/Videos/Upload/UploadCaptionsNotice';
import { LivepeerAiFeatureProvider } from '@/context/LivepeerAiFeatureContext';

describe('UploadCaptionsNotice', () => {
  it('shows Captions coming soon when captions flag is off', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: false, textToImageEnabled: true }}
      >
        <UploadCaptionsNotice />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toContain('Captions coming soon');
  });

  it('renders nothing when captions flag is on', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: true, textToImageEnabled: false }}
      >
        <UploadCaptionsNotice />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toBe('');
  });
});
