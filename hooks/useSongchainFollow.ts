'use client';

import { useCallback } from 'react';
import { follow, unfollow } from '@lens-protocol/client/actions';
import { evmAddress } from '@lens-protocol/types';
import { useLensOrbWrite } from '@/hooks/useLensOrbWrite';
import { clearStaleOrbSessionIfNeeded } from '@/lib/sdk/orb/session-errors';
import { resolveSongchainGraphAddress } from '@/lib/songchain/lens-graph';
import { toast } from 'sonner';

export function useSongchainFollow(graphId: string | null) {
  const { canWrite, lensAccount, getSessionClient, promptWriteAccess } =
    useLensOrbWrite();

  const graphAddress = resolveSongchainGraphAddress(graphId);

  const followAccount = useCallback(
    async (accountAddress: string) => {
      if (!graphAddress) {
        toast.error('Songchain graph is not configured.');
        return false;
      }
      if (!canWrite) {
        promptWriteAccess();
        toast.info('Link Orb and join the group to follow on this graph.');
        return false;
      }
      if (lensAccount?.toLowerCase() === accountAddress.toLowerCase()) {
        return false;
      }

      try {
        const client = await getSessionClient();
        const result = await follow(client, {
          account: evmAddress(accountAddress),
          graph: evmAddress(graphAddress),
        });
        if (result.isErr()) throw new Error(result.error.message);
        toast.success('Following on Creative graph');
        return true;
      } catch (err) {
        clearStaleOrbSessionIfNeeded(err);
        toast.error(err instanceof Error ? err.message : 'Follow failed');
        return false;
      }
    },
    [graphAddress, canWrite, lensAccount, getSessionClient, promptWriteAccess],
  );

  const unfollowAccount = useCallback(
    async (accountAddress: string) => {
      if (!graphAddress || !canWrite) return false;
      try {
        const client = await getSessionClient();
        const result = await unfollow(client, {
          account: evmAddress(accountAddress),
          graph: evmAddress(graphAddress),
        });
        if (result.isErr()) throw new Error(result.error.message);
        toast.success('Unfollowed');
        return true;
      } catch (err) {
        clearStaleOrbSessionIfNeeded(err);
        toast.error(err instanceof Error ? err.message : 'Unfollow failed');
        return false;
      }
    },
    [graphAddress, canWrite, getSessionClient],
  );

  return {
    graphAddress,
    followAccount,
    unfollowAccount,
  };
}
