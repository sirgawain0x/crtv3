import { StackClient } from '@stackso/js-core';

// Initialize the client
export const stack = new StackClient({
  apiKey: `${process.env.STACK_API_KEY}`,
  pointSystemId: 2777,
});
