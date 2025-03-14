import { StackClient } from '@stackso/js-core';

// Initialize the client
export const stack = new StackClient({
  apiKey: process.env.NEXT_PUBLIC_STACK_API_KEY ?? '',
  pointSystemId: 2777,
});

// Helper function to ensure proper token format
export const ensureValidToken = (token: string | object): string => {
  if (!token) return '';

  if (typeof token === 'object') {
    // If it's a Thirdweb auth object, extract the address
    if ('address' in token) {
      return token.address as string;
    }

    // Check if it's a Uint8Array
    if (token instanceof Uint8Array) {
      return Buffer.from(token).toString('base64url');
    }

    // Check if it has a property that is a Uint8Array (common in some crypto libraries)
    const tokenObj = token as Record<string, unknown>;
    for (const key in tokenObj) {
      if (tokenObj[key] instanceof Uint8Array) {
        return Buffer.from(tokenObj[key] as Uint8Array).toString('base64url');
      }
    }

    // Check if it has a .buffer property (TypedArray interface)
    if ('buffer' in token && (token as any).buffer instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array((token as any).buffer)).toString(
        'base64url',
      );
    }

    // Check if it's array-like with numeric properties
    if (
      Array.isArray(token) ||
      ('length' in token && typeof (token as any).length === 'number')
    ) {
      try {
        return Buffer.from(new Uint8Array(token as any)).toString('base64url');
      } catch (e) {
        // If conversion fails, continue to default handling
      }
    }

    // Otherwise stringify the object and encode it
    return Buffer.from(JSON.stringify(token)).toString('base64url');
  }

  // If it's already a string, return it as is
  return token;
};

// Helper function to format address for Stack
export const formatAddress = (
  address: string | object | null | undefined,
): string => {
  if (!address) return '';

  if (typeof address === 'object') {
    // If it's a Thirdweb account object, extract the address
    if ('address' in address) {
      return address.address as string;
    }
    return '';
  }

  return address;
};
