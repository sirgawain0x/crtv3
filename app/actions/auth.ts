'use server';

import { z } from 'zod';
import type { ActionResponse } from '../types/actions';

const AuthSchema = z.object({
  address: z.string().min(42).max(42),
  chainId: z.number().int().positive(),
});

interface AuthData {
  address: string;
}

type AuthResponse = ActionResponse<AuthData>;

export async function authenticate(formData: unknown): Promise<AuthResponse> {
  try {
    const result = AuthSchema.parse(formData);
    const { address } = result;

    if (!address.startsWith('0x')) {
      return {
        success: false,
        error: 'Invalid Ethereum address format',
      };
    }

    return {
      success: true,
      data: { address },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error:
          'Invalid input: ' + error.errors.map((e) => e.message).join(', '),
      };
    }
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}
