import { type Address } from 'viem';

/**
 * Checks if a user has access to Unlock-protected content
 * @param address - The user's Ethereum address
 * @returns Promise<boolean> - Whether the user has access
 */
export async function checkUnlockAccess(address: Address): Promise<boolean> {
  try {
    const response = await fetch(`/api/auth/unlock?address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check Unlock access');
    }

    const data = await response.json();
    return data.hasAccess;
  } catch (error) {
    console.error('Error in checkUnlockAccess:', error);
    return false;
  }
}
