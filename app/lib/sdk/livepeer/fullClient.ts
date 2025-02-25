import { Livepeer } from 'livepeer';

// Get the API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_LIVEPEER_FULL_API_KEY;

// Create a Livepeer client only if the API key is available
export const fullLivepeer = apiKey 
  ? new Livepeer({ apiKey }) 
  : new Livepeer({ 
      apiKey: 'dummy-key-for-development', // Fallback to a dummy key that will fail gracefully
    });
