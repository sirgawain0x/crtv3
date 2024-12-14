import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@app/api/livepeer/translation/route';
import { NextRequest } from 'next/server';

describe('Translation Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should handle successful translation', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/livpeer/translation', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello',
        source: 'English',
        target: 'French'
      })
    });

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ llmResponse: 'Bonjour' })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      response: 'Bonjour'
    });
  });

  it('should validate required fields', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/livpeer/translation', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello',
        source: ''
      })
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data).toEqual({
      success: false,
      message: 'Missing required fields'
    });
  });

  it('should handle text length restrictions', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/livpeer/translation', {
      method: 'POST',
      body: JSON.stringify({
        text: 'a'.repeat(1001),
        source: 'English',
        target: 'French'
      })
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data).toEqual({
      success: false,
      message: 'Text exceeds maximum length of 1000 characters'
    });
  });

  it('should handle missing API key', async () => {
    const originalApiKey = process.env.LIVEPEER_FULL_API_KEY;
    try {
      process.env.LIVEPEER_FULL_API_KEY = '';
      const mockRequest = new NextRequest('http://localhost:3000/api/livpeer/translation', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello',
          source: 'English',
          target: 'French'
        })
      });

      const response = await POST(mockRequest);

      expect(response.ok).toBeFalse();
      expect(response.status).toBe(401)
      expect(response.statusText).toBe('Authentication error: Please provide Livepeer API key')
      
      const data = await response.json();
      
      expect(data.success).toBeFalse();
    } finally {
      process.env.LIVEPEER_FULL_API_KEY = originalApiKey;
    }
  });
  
  it('should handle request timeout', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/livpeer/translation', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello',
        source: 'English',
        target: 'French'
      })
    });
  
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 31000))
    );
  
    const response = await POST(mockRequest);

    expect(response.ok).toBeFalse();
    
    const data = await response.json();
  
    expect(data.success).toBe(false);
  }, 32000);
});