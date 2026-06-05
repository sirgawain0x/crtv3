import { fetchGraph } from '@lens-protocol/client/actions';
import { evmAddress } from '@lens-protocol/types';
import { createLensClient } from '@/lib/sdk/lens/create-client';
import { getLensNetwork, type LensNetwork } from '@/lib/sdk/lens/chains';
import {
  extractLensContractAddress,
  getLensContractAddressError,
} from '@/lib/sdk/lens/primitive-id';
import { getLensNetworkLabel, truncateFeedId } from '@/lib/songchain/feed-diagnostics';

export type LensGraphCheckResult = {
  graphAddress: `0x${string}` | null;
  exists: boolean;
  error: string | null;
};

export function resolveSongchainGraphAddress(
  graphId: string | null | undefined,
): `0x${string}` | null {
  return extractLensContractAddress(graphId);
}

export async function checkLensGraphExists(
  graphId: string | null | undefined,
  network: LensNetwork = getLensNetwork(),
): Promise<LensGraphCheckResult> {
  const graphAddress = resolveSongchainGraphAddress(graphId);
  if (!graphAddress) {
    return {
      graphAddress: null,
      exists: false,
      error: getLensContractAddressError(graphId, 'Graph contract ID'),
    };
  }

  const client = createLensClient();
  const result = await fetchGraph(client, { graph: evmAddress(graphAddress) });

  if (result.isErr()) {
    return {
      graphAddress,
      exists: false,
      error: result.error.message,
    };
  }

  if (!result.value) {
    return {
      graphAddress,
      exists: false,
      error: buildGraphNotFoundMessage(graphId, network),
    };
  }

  return { graphAddress, exists: true, error: null };
}

export function buildGraphNotFoundMessage(
  graphId: string | null | undefined,
  network: LensNetwork = getLensNetwork(),
): string {
  const label = getLensNetworkLabel(network);
  const display = truncateFeedId(resolveSongchainGraphAddress(graphId) ?? graphId ?? null);
  return (
    `Graph ${display} is not registered on ${label}. ` +
    'Set NEXT_PUBLIC_SONGCHAIN_GRAPH_ID to your Lens graph contract, ' +
    'or NEXT_PUBLIC_SONGCHAIN_APP_ID to resolve it from the app.'
  );
}
