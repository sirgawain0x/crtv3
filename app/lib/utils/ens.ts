import { type Address, type PublicClient } from 'viem';

interface EnsResolveResult {
  address: Address | null;
  error?: string;
}

interface EnsError {
  message: string;
  [key: string]: any;
}

export async function resolveEnsNameSafely(
  ensName: string,
  publicClient: PublicClient,
): Promise<EnsResolveResult> {
  try {
    // Check if we're on Base chain
    const chainId = await publicClient.getChainId();
    if (chainId === 8453) {
      // Base chain ID
      return {
        address: null,
        error: 'ENS resolution is not supported on Base chain',
      };
    }

    const address = await publicClient.getEnsAddress({
      name: ensName,
    });

    return {
      address,
      error: address ? undefined : 'ENS name not found',
    };
  } catch (error) {
    const err = error as EnsError;
    if (
      err.message?.includes(
        'Chain "Base" does not support contract "ensUniversalResolver"',
      )
    ) {
      return {
        address: null,
        error: 'ENS resolution is not supported on Base chain',
      };
    }

    return {
      address: null,
      error: 'Failed to resolve ENS name',
    };
  }
}
