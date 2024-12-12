import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, OPTIONS } from '@app/api/livepeer/audio-to-text/route';
import { NextRequest } from 'next/server';

describe('Audio to Text Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should handle successful audio to text conversion', async () => {
    const mockFormData = new FormData();
    mockFormData.append('audio', new File(['test'], 'test.mp4', { type: 'video/mp4' }));
    
    const mockRequest = new NextRequest('http://localhost:3000/api/livepeer/audio-to-text', {
      method: 'POST',
    });
    mockRequest.formData = () => Promise.resolve(mockFormData);

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ chunks: [{ text: 'Transcribed text', timestamp: [0, 0]}], text: 'Transcribed text' })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      response: { 
        chunks: [
          { 
            text: 'Transcribed text', 
            timestamp: [0, 0]
          }
        ], 
        text: 'Transcribed text' 
      }
    });
  });

  it('should handle missing audio file', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/livepeer/audio-to-text', {
      method: 'POST',
    });
    mockRequest.formData = () => Promise.resolve(new FormData());

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data).toEqual({
      success: false,
      message: 'Audio file is required'
    });
  });

//   it('should handle OPTIONS request for CORS', async () => {
//     const response = await OPTIONS();
//     expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST');
//   });
});