import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import {
  prepareContractCall,
  getContract,
  getRpcClient,
  eth_getTransactionByHash,
} from 'thirdweb';
import { client } from '@app/lib/sdk/thirdweb/client';
import { Abi } from 'viem';
import { base } from 'thirdweb/chains';
import {
  useSendTransaction,
  TransactionButton,
  useActiveAccount,
} from 'thirdweb/react';
import { useState } from 'react';
import { toast } from 'sonner';
import MetokenFactory from '@app/lib/utils/MetokenFactory.json';
import { useMetoken } from '@app/hooks/useMetoken';
import { getUserMetoken } from '@app/lib/sdk/hyperindex/queries/metoken.new';

interface CreateMetokenButtonProps {
  name: string;
  symbol: string;
  diamond: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function CreateMetokenButton({
  name,
  symbol,
  diamond,
  onSuccess,
  onError,
}: CreateMetokenButtonProps) {
  const { insertMetokenMetadata, isConnected, orbisLogin } = useOrbisContext();
  const activeAccount = useActiveAccount();
  const { hasMetoken, isLoading: isCheckingMetoken } = useMetoken(
    activeAccount?.address,
  );

  const handleCreateMetoken = async () => {
    try {
      if (!name || !symbol || !diamond) {
        toast.error('Please fill in all required fields');
        return null;
      }

      if (hasMetoken) {
        toast.error('You already have a metoken');
        throw new Error('User already has a metoken');
      }

      if (!activeAccount?.address) {
        toast.error('Please connect your wallet');
        throw new Error('No wallet connected');
      }

      console.log('Creating contract with params:', {
        name,
        symbol,
        diamond,
        userAddress: activeAccount.address,
      });

      const contract = getContract({
        client,
        chain: base,
        address: '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B',
      });

      if (!contract) {
        throw new Error('Failed to get contract');
      }

      const tx = prepareContractCall({
        contract,
        method:
          'function create(string name, string symbol, address diamond) returns (address)',
        params: [name, symbol, diamond],
      });

      console.log('Transaction prepared:', tx);
      return tx;
    } catch (error) {
      console.error('Error in handleCreateMetoken:', error);
      throw error;
    }
  };

  const handleSuccess = async (receipt: any) => {
    try {
      console.log('Transaction receipt:', receipt);

      // Get the token address from the transaction receipt logs
      const tokenCreationLog = receipt.logs[0]; // Assuming the token creation event is the first log
      const tokenAddress = tokenCreationLog.address;
      console.log('Created token address:', tokenAddress);

      if (!tokenAddress) {
        toast.error('Failed to get token address from transaction');
        throw new Error('No token address found in transaction logs');
      }

      // Wait for indexer to index the new metoken
      console.log('Waiting for indexer to index the new metoken...');
      let metokenData = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!metokenData && attempts < maxAttempts) {
        attempts++;
        // Wait for 2 seconds between attempts
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          if (!activeAccount?.address) {
            console.log('No active account address found');
            continue;
          }
          metokenData = await getUserMetoken(activeAccount.address);
          if (
            metokenData &&
            metokenData.meToken.toLowerCase() === tokenAddress.toLowerCase()
          ) {
            console.log('Metoken found in indexer:', metokenData);
            break;
          }
          metokenData = null; // Reset if the found token doesn't match
        } catch (error) {
          console.log(
            `Attempt ${attempts}: Error fetching from indexer:`,
            error,
          );
        }
      }

      if (!metokenData) {
        console.warn(
          `Could not find metoken in indexer after ${maxAttempts} attempts`,
        );
      }

      // Ensure user is connected to OrbisDB
      if (!activeAccount?.address) {
        toast.error('No active account found');
        throw new Error('No active account address available');
      }

      const isConnectedResult = await isConnected(activeAccount.address);
      if (!isConnectedResult) {
        console.log('Not connected to OrbisDB, attempting login...');
        const loginResult = await orbisLogin();
        if (!loginResult) {
          throw new Error('Failed to connect to OrbisDB');
        }
      }

      console.log('Saving metadata to OrbisDB...');
      try {
        // Store the metadata in OrbisDB with data from indexer if available
        const metokenMetadata = {
          address: tokenAddress,
          token_name: metokenData?.name || name,
          token_symbol: metokenData?.symbol || symbol,
          meToken: metokenData?.meToken || tokenAddress,
          asset: metokenData?.asset,
          assetsDeposited: metokenData?.assetsDeposited,
          minted: metokenData?.minted,
          hubId: metokenData?.hubId,
        };
        await insertMetokenMetadata(metokenMetadata);
      } catch (error) {
        console.error('Error saving metadata to OrbisDB:', error);
        toast.error('Failed to save metoken metadata');
        onError?.(error as Error);
        return;
      }

      console.log('Metadata saved successfully');
      toast.success('Metoken created successfully!');

      // Ensure onSuccess is called after metadata is saved
      if (onSuccess) {
        console.log('Calling onSuccess callback...');
        onSuccess();
      }
    } catch (error) {
      console.error('Error in handleSuccess:', error);
      toast.error('Failed to save metoken metadata');
      onError?.(error as Error);
    }
  };

  return (
    <TransactionButton
      transaction={async () => {
        const tx = await handleCreateMetoken();
        if (!tx) throw new Error('Failed to prepare transaction');
        return tx;
      }}
      onTransactionConfirmed={handleSuccess}
      onError={(error) => {
        console.error('Transaction failed:', error);
        toast.error(`Transaction Failed: ${error.message || 'Unknown error'}`);
        onError?.(error);
      }}
      disabled={isCheckingMetoken || hasMetoken || !name || !symbol || !diamond}
      className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
    >
      {isCheckingMetoken
        ? 'Checking...'
        : hasMetoken
          ? 'You already have a metoken'
          : 'Create Metoken'}
    </TransactionButton>
  );
}
