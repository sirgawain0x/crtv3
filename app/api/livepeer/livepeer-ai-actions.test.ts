import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLivepeerAiGeneratedImages as getSdkTextToImage } from './textToImage';
import { getLivepeerAiGeneratedImages as getFetchTextToImage } from './livepeerAiActions';
import { getLivepeerTranslation } from './translate';
import { LIVEPEER_AI_DISABLED_STATUS } from '@/lib/livepeer/livepeer-ai-gating';

vi.mock('@/lib/sdk/livepeer/fullClient', () => ({
  fullLivepeer: {
    generate: {
      textToImage: vi.fn(async () => ({
        imageResponse: { images: ['https://example.com/a.png'] },
      })),
    },
  },
}));

import { fullLivepeer } from '@/lib/sdk/livepeer/fullClient';

describe('Livepeer AI server action gating', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'hola' }),
      status: 200,
      statusText: 'OK',
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('LIVEPEER_FULL_API_KEY', 'test-livepeer-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('both flags off: typed disabled results and zero network or SDK calls', async () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'false');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'false');

    const translation = await getLivepeerTranslation({
      text: 'hello',
      source: 'English',
      target: 'Spanish',
    });
    expect(translation).toEqual({
      status: LIVEPEER_AI_DISABLED_STATUS,
      feature: 'captions',
    });

    const sdkResult = await getSdkTextToImage({ prompt: 'test' } as never);
    expect(sdkResult).toEqual({
      status: LIVEPEER_AI_DISABLED_STATUS,
      feature: 'text-to-image',
    });

    const fetchResult = await getFetchTextToImage({ prompt: 'test' } as never);
    expect(fetchResult).toEqual({
      status: LIVEPEER_AI_DISABLED_STATUS,
      feature: 'text-to-image',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(fullLivepeer.generate.textToImage).not.toHaveBeenCalled();
  });

  it('captions off: zero Livepeer AI fetch for translation', async () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'false');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'true');

    const translation = await getLivepeerTranslation({
      text: 'hello',
      source: 'English',
      target: 'Spanish',
    });
    expect(translation).toEqual({
      status: LIVEPEER_AI_DISABLED_STATUS,
      feature: 'captions',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(fullLivepeer.generate.textToImage).not.toHaveBeenCalled();
  });

  it('text-to-image off: zero Livepeer AI calls for both T2I paths', async () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'true');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'false');

    const sdkResult = await getSdkTextToImage({
      prompt: 'test',
    } as never);
    expect(sdkResult).toEqual({
      status: LIVEPEER_AI_DISABLED_STATUS,
      feature: 'text-to-image',
    });

    const fetchResult = await getFetchTextToImage({
      prompt: 'test',
    } as never);
    expect(fetchResult).toEqual({
      status: LIVEPEER_AI_DISABLED_STATUS,
      feature: 'text-to-image',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(fullLivepeer.generate.textToImage).not.toHaveBeenCalled();
  });

  it('captions on + t2i off: translation uses fetch, t2i stays disabled', async () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'true');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'false');

    await getLivepeerTranslation({
      text: 'hello',
      source: 'English',
      target: 'Spanish',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://livepeer.studio/api/beta/generate/llm',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fullLivepeer.generate.textToImage).not.toHaveBeenCalled();
  });

  it('captions off + t2i on: SDK text-to-image runs, captions fetch does not', async () => {
    vi.stubEnv('LIVEPEER_AI_CAPTIONS_ENABLED', 'false');
    vi.stubEnv('LIVEPEER_AI_TEXT_TO_IMAGE_ENABLED', 'true');

    const result = await getSdkTextToImage({ prompt: 'neon city' } as never);
    expect(result).toEqual({ images: ['https://example.com/a.png'] });
    expect(fullLivepeer.generate.textToImage).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
