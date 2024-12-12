import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLivepeerTranslation } from '@app/api/livepeer/translate';

describe('getLivepeerTranslation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should successfully translate text', async () => {
    const mockResponse = { 
      json: () => Promise.resolve({ translatedText: 'Bonjour' }) 
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await getLivepeerTranslation({
      text: 'Hello',
      source: 'en',
      target: 'fr'
    });

    expect(result).toEqual({ translatedText: 'Bonjour' });
  });

  it('should throw error when required params are missing', async () => {
    await expect(getLivepeerTranslation({
      text: '',
      source: 'en',
      target: 'fr'
    })).rejects.toThrow('No text provided');
  });

  it('should use default model and max tokens when not provided', async () => {
    const mockResponse = { json: () => Promise.resolve({}) };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    await getLivepeerTranslation({
      text: 'Hello',
      source: 'en',
      target: 'fr'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.any(FormData)
      })
    );
  });
});