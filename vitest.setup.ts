import '@testing-library/jest-dom'
import { vi } from 'vitest';
import * as matchers from 'jest-extended';

// Setup jest-extended for additional matchers (e.g., toHaveBeenCalledBefore, ...etc)
expect.extend(matchers); 

// Mock Next.js components/functions
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => 
      new Response(JSON.stringify(data), {
        ...init,
        headers: { 'content-type': 'application/json' },
      }),
  },
  NextRequest: class MockNextRequest extends Request {
    nextUrl: URL;
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, init);
      this.nextUrl = new URL(input.toString());
    }
  },
}));

// Add any other global test setup here
  