/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormProvider, useForm } from 'react-hook-form';
import {
  SubtitlesCaptionsAiPanel,
  SubtitlesLanguageSelect,
  SubtitlesProvider,
} from '@/components/Player/Subtitles';
import { LivepeerAiFeatureProvider } from '@/context/LivepeerAiFeatureContext';

function FormShell({ children }: { children: React.ReactNode }) {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
}

vi.mock('@/app/api/livepeer/audioToText', () => ({
  getLivepeerAudioToText: vi.fn(),
}));
vi.mock('@/app/api/livepeer/translate', () => ({
  getLivepeerTranslation: vi.fn(),
}));

describe('Subtitles Livepeer AI UI', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows Captions coming soon when captions flag is off', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: false, textToImageEnabled: true }}
      >
        <SubtitlesCaptionsAiPanel hasStoredSubtitles={false} />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toContain('Captions coming soon');
    expect(html).not.toContain('Generate captions');
  });

  it('shows generate and translate when captions flag is on', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: true, textToImageEnabled: true }}
      >
        <SubtitlesCaptionsAiPanel hasStoredSubtitles={false} />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toContain('Generate captions');
    expect(html).toContain('Translate captions');
  });

  it('hides caption generation panel when stored subtitles exist', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: false, textToImageEnabled: true }}
      >
        <SubtitlesCaptionsAiPanel hasStoredSubtitles={true} />
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toBe('');
  });

  it('still renders stored subtitle languages when captions flag is off', () => {
    const html = renderToStaticMarkup(
      <LivepeerAiFeatureProvider
        value={{ captionsEnabled: false, textToImageEnabled: false }}
      >
        <FormShell>
          <SubtitlesProvider
            initialSubtitles={{
              English: [{ text: 'Stored line', timestamp: [0, 4] }],
            }}
          >
            <SubtitlesLanguageSelect />
          </SubtitlesProvider>
        </FormShell>
      </LivepeerAiFeatureProvider>,
    );
    expect(html).toContain('English');
    expect(html).toContain('Subtitles Language');
  });
});
