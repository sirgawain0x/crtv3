'use server';

import { z } from 'zod';
import type { SiweAuthResult } from '../types/auth';
import { db } from '../sdk/orbisDB/client';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';

const siweAuthSchema = z.object({
  address: z.string().startsWith('0x'),
  signature: z.string(),
  nonce: z.string(),
});

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type SignInInput = z.infer<typeof siweAuthSchema>;
export type SignInOutput = {
  did: string;
  address: string;
};

export async function signIn(
  data: SignInInput,
): Promise<ActionResponse<SignInOutput>> {
  try {
    // Validate input
    const validatedData = siweAuthSchema.parse(data);

    // Verify SIWE message
    const auth = new OrbisEVMAuth({
      request: async ({ method, params }) => {
        // In a real app, you would verify the signature on the backend
        // For now, we'll just return success
        return { success: true };
      },
    });

    // Connect to OrbisDB
    const result = await db.connectUser({ auth });

    if (!result || typeof result !== 'object' || !('did' in result)) {
      throw new Error('Failed to connect to OrbisDB');
    }

    return {
      success: true,
      data: {
        did: result.did as string,
        address: validatedData.address,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign in',
    };
  }
}

export async function signOut(): Promise<ActionResponse> {
  try {
    await db.disconnectUser();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign out',
    };
  }
}
