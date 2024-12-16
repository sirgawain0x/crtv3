import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLivepeerTranslation } from '@app/api/livepeer/translate';

describe('getLivepeerTranslation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should successfully translate text', async () => {
    const mockResponse = { 
      ok: true, 
      status: 200,
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

  it('should throw error when text param are missing', async () => {
    await expect(getLivepeerTranslation({
      text: '',
      source: 'en',
      target: 'fr'
    })).rejects.toThrow('No text provided');
  });

  it('should throw error when source language is missing', async () => {
    await expect(getLivepeerTranslation({
      text: 'Hello',
      source: '',
      target: 'fr'
    })).rejects.toThrow('No source language provided');
  });
  
  it('should throw error when target language is missing', async () => {
    await expect(getLivepeerTranslation({
      text: 'Hello',
      source: 'en',
      target: ''
    })).rejects.toThrow('No target language provided');
  });

  it('should handle API errors', async () => {
    const mockResponse = { 
      ok: false,
      status: 500,
      statusText: 'Failed to translate text'
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
  
    await expect(getLivepeerTranslation({
      text: 'Hello',
      source: 'en',
      target: 'fr'
    })).rejects.toThrow('Livepeer API error 500: Failed to translate text');     
  });
});