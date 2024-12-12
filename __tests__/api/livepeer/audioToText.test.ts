import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLivepeerAudioToText } from '@app/api/livepeer/audioToText';

describe('getLivepeerAudioToText', () => {
  const mockFormData = new FormData();
  const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockFormData.append('audio', mockFile);
  });

  it('should successfully convert audio to text', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ text: 'Transcribed text' }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await getLivepeerAudioToText({ formData: mockFormData });
    expect(result).toEqual({ text: 'Transcribed text' });
  });

  it('should throw error when no file is provided', async () => {
    const emptyFormData = new FormData();
    await expect(getLivepeerAudioToText({ formData: emptyFormData }))
      .rejects
      .toThrow('No file uploaded');
  });

  it('should handle API errors', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Error message'),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse);

    await expect(getLivepeerAudioToText({ formData: mockFormData }))
      .rejects
      .toThrow('API request failed: 400 Bad Request');
  });
});