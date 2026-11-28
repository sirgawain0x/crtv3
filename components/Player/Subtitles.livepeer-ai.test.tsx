/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormProvider, useForm } from 'react-hook-form';
import {
  SubtitlesLanguageSelect,
  SubtitlesProvider,
} from '@/components/Player/Subtitles';
import { LivepeerAiFeatureProvider } from '@/context/LivepeerAiFeatureContext';

function FormShell({ children }: { children: React.ReactNode }) {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('stored subtitles with Livepeer AI flags', () => {
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
