import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
  sendAndConfirmTransaction,
} from 'thirdweb';
import Image from 'next/image';
import { client } from '@app/lib/sdk/thirdweb/client';
import { Abi, Log, parseEther, getAddress, formatEther, isAddress } from 'viem';
import { base } from 'thirdweb/chains';
import {
  useSendTransaction,
  TransactionButton,
  useActiveAccount,
} from 'thirdweb/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMetoken } from '@app/hooks/useMetoken';
import { getUserMetoken } from '@app/lib/sdk/hyperindex/queries/metoken.new';
import { gql } from 'graphql-request';
import { hyperindexClient } from '@app/lib/sdk/hyperindex/client';
import { CheckOwnerResponse } from '@app/types/metoken';
import { balanceOf, allowance, approve } from 'thirdweb/extensions/erc20';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';

// Contract address for the meToken factory
const FACTORY_ADDRESS = getAddress(
  '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B',
);
// DAI address on Base - Default Asset
// const DAI_ADDRESS = getAddress('0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb');
// Zero address
// const ZERO_ADDRESS = getAddress('0x0000000000000000000000000000000000000000');

const SUPPORTED_ASSETS = [
  {
    name: 'DAI',
    symbol: 'DAI',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    image:
      'https://bafybeieuzwktu36qfl3a5u4em222zke4cpq57soudjuks2dgjzxmzeofta.ipfs.dweb.link?filename=multi-collateral-dai-dai-logo.svg',
  },
] as const;

const CHECK_OWNER_QUERY = gql`
  query CheckOwnerInRegister($ownerAddress: String!) {
    Metokens_Register(where: { owner: { _eq: $ownerAddress } }) {
      id
      owner
      asset
      vault
      db_write_timestamp
    }
  }
`;

interface CreateMetokenButtonProps {
  name: string;
  symbol: string;
  diamond: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ABI for the register function
const REGISTER_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'vault', type: 'address' },
      { name: 'refundRatio', type: 'uint256' },
      { name: 'baseY', type: 'uint256' },
      { name: 'reserveWeight', type: 'uint32' },
      { name: 'encodedVaultArgs', type: 'bytes' },
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Add ERC20 ABI for balance and allowance checks
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const FACTORY_ABI = [
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'refundRatio', type: 'uint256' },
      { name: 'reserveWeight', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
    ],
    name: 'createMeToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export default function CreateMetokenButton({
  name,
  symbol,
  diamond,
  onSuccess,
  onError,
}: CreateMetokenButtonProps) {
  const { insertMetokenMetadata, isConnected, orbisLogin } = useOrbisContext();
  const activeAccount = useActiveAccount();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(SUPPORTED_ASSETS[0]);
  const [refundRatioInput, setRefundRatioInput] = useState('0.5');
  const [reserveWeightInput, setReserveWeightInput] = useState('50');

  const checkAddressRegistered = async (
    ownerAddress: string,
  ): Promise<boolean> => {
    try {
      const response = await hyperindexClient.request<CheckOwnerResponse>(
        CHECK_OWNER_QUERY,
        {
          ownerAddress: ownerAddress.toLowerCase(),
        },
      );

      const hasExistingToken = !!(
        response.Metokens_Register && response.Metokens_Register.length > 0
      );

      if (hasExistingToken) {
        const existingToken = response.Metokens_Register[0];
        console.log('Found existing meToken:', {
          id: existingToken.id,
          asset: existingToken.asset,
          vault: existingToken.vault,
          registeredAt: new Date(
            existingToken.db_write_timestamp,
          ).toLocaleString(),
        });
      }

      return hasExistingToken;
    } catch (error) {
      console.error('Error checking registration:', error);
      throw new Error('Failed to check if address is already registered');
    }
  };

  const handleCreateMetoken = async () => {
    try {
      if (!activeAccount) {
        toast.error('Please connect your wallet first');
        throw new Error('No wallet connected');
      }

      setIsChecking(true);

      const ownerAddress = activeAccount.address;
      const isRegistered = await checkAddressRegistered(ownerAddress);

      if (isRegistered) {
        toast.error('Address already has a meToken');
        throw new Error('Address already has a meToken');
      }

      // Get the asset contract
      const assetContract = getContract({
        address: selectedAsset.address,
        abi: ERC20_ABI,
        client,
        chain: base,
      });

      // Check balance and allowance
      const balanceResult = await balanceOf({
        contract: assetContract,
        address: activeAccount.address,
      });
      const allowanceResult = await allowance({
        contract: assetContract,
        owner: activeAccount.address,
        spender: FACTORY_ADDRESS,
      });

      if (balanceResult < parseEther('1')) {
        toast.error('Insufficient balance');
        throw new Error('Insufficient balance');
      }

      // If allowance is too low, request approval
      if (allowanceResult < parseEther('1')) {
        toast.info(`Requesting ${selectedAsset.symbol} approval...`);
        try {
          const approveTx = approve({
            contract: assetContract,
            spender: activeAccount.address,
            amountWei: parseEther('1'),
          });

          // Send and wait for the approval transaction
          const receipt = await sendAndConfirmTransaction({
            transaction: approveTx,
            account: activeAccount,
          });

          toast.success(`${selectedAsset.symbol} approved successfully`);
        } catch (error) {
          console.error('Approval error:', error);
          toast.error(`Failed to approve ${selectedAsset.symbol}`);
          throw new Error('Failed to approve asset');
        }
      }

      // Convert inputs to correct format
      const refundRatio = BigInt(
        Math.floor(parseFloat(refundRatioInput) * 1e18),
      );
      const reserveWeight = BigInt(
        Math.floor(parseInt(reserveWeightInput) * 1e16),
      );

      // Prepare meToken creation transaction
      const factoryContract = getContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI as Abi,
        client,
        chain: base,
      });

      // Return the prepared transaction
      return prepareContractCall({
        contract: factoryContract,
        method:
          'function createMeToken(address asset, uint256 refundRatio, uint256 reserveWeight, string name, string symbol)',
        params: [
          selectedAsset.address,
          refundRatio,
          reserveWeight,
          'My MeToken',
          'ME',
        ],
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
      throw error; // Re-throw the error instead of returning null
    } finally {
      setIsChecking(false);
    }
  };

  const handleSuccess = async (receipt: any) => {
    try {
      // Insert metadata into OrbisDB
      if (await isConnected(activeAccount?.address as string)) {
        await insertMetokenMetadata({
          address: activeAccount?.address as string,
          token_name: 'My MeToken',
          token_symbol: 'ME',
        });
      }

      // Call the onSuccess callback if provided
      if (onSuccess) {
        console.log('Calling onSuccess callback...');
        onSuccess();
      }
    } catch (error) {
      console.error('Error in success handler:', error);
      toast.error('Failed to save metadata');
    }
  };

  return (
    <div>
      <div className="grid gap-4">
        {/* Asset Selector */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2">
            Asset
            <span
              className="text-sm text-gray-500 hover:cursor-pointer"
              title="The token that backs yours"
            >
              ℹ️
            </span>
          </Label>
          <Select
            value={selectedAsset.address}
            onValueChange={(value) => {
              const asset = SUPPORTED_ASSETS.find((a) => a.address === value);
              if (asset) {
                setSelectedAsset(asset);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Image
                    src={selectedAsset.image}
                    alt={selectedAsset.symbol}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full"
                  />
                  <span>
                    {selectedAsset.name} ({selectedAsset.symbol})
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Supported Assets</SelectLabel>
                {SUPPORTED_ASSETS.map((asset) => (
                  <SelectItem
                    key={asset.address}
                    value={asset.address}
                    className="flex items-center gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={asset.image}
                        alt={asset.symbol}
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded-full"
                      />
                      <span>
                        {asset.name} ({asset.symbol})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Refund Ratio Input */}
        <div className="grid grid-cols-4 items-center">
          <Label htmlFor="refundRatio" className="flex items-center gap-2">
            Refund Ratio
            <span
              className="text-sm text-gray-500 hover:cursor-pointer"
              title="The percentage of tokens that can be refunded (0-1)"
            >
              ℹ️
            </span>
          </Label>
          <div className="col-span-3">
            <Input
              type="number"
              id="refundRatio"
              value={refundRatioInput}
              onChange={(e) => setRefundRatioInput(e.target.value)}
              className={`w-full ${
                parseFloat(refundRatioInput) < 0 ||
                parseFloat(refundRatioInput) > 1
                  ? 'border-red-500'
                  : ''
              }`}
              min="0"
              max="1"
              step="0.01"
              placeholder="Enter refund ratio (0-1)"
            />
            {(parseFloat(refundRatioInput) < 0 ||
              parseFloat(refundRatioInput) > 1) && (
              <p className="mt-1 text-sm text-red-500">
                Refund ratio must be between 0 and 1
              </p>
            )}
          </div>
        </div>

        {/* Reserve Weight Input */}
        <div className="mb-4 grid grid-cols-4 items-center">
          <Label htmlFor="reserveWeight" className="flex items-center gap-2">
            Reserve Weight
            <span
              className="text-sm text-gray-500 hover:cursor-pointer"
              title="The reserve ratio percentage (0-100%)"
            >
              ℹ️
            </span>
          </Label>
          <div className="col-span-3">
            <Input
              type="number"
              id="reserveWeight"
              value={reserveWeightInput}
              onChange={(e) => setReserveWeightInput(e.target.value)}
              className={`w-full ${
                parseInt(reserveWeightInput) < 0 ||
                parseInt(reserveWeightInput) > 100
                  ? 'border-red-500'
                  : ''
              }`}
              min="0"
              max="100"
              step="1"
              placeholder="Enter reserve weight (0-100%)"
            />
            {(parseInt(reserveWeightInput) < 0 ||
              parseInt(reserveWeightInput) > 100) && (
              <p className="mt-1 text-sm text-red-500">
                Reserve weight must be between 0 and 100
              </p>
            )}
          </div>
        </div>
      </div>

      <TransactionButton
        transaction={handleCreateMetoken}
        onTransactionConfirmed={handleSuccess}
        onError={(error) => {
          console.error('Transaction failed:', error);
          toast.error(
            `Transaction Failed: ${error.message || 'Unknown error'}`,
          );
          onError?.(error);
        }}
        disabled={
          isChecking ||
          !name ||
          !symbol ||
          !diamond ||
          parseFloat(refundRatioInput) < 0 ||
          parseFloat(refundRatioInput) > 1 ||
          parseInt(reserveWeightInput) < 0 ||
          parseInt(reserveWeightInput) > 100
        }
        className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isChecking ? 'Checking registration...' : 'Create Metoken'}
      </TransactionButton>
    </div>
  );
}
