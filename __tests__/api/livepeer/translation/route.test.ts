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
});