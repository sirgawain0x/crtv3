import { Abi } from 'viem';
import { getDefaultLightAccountFactoryAddress } from '@account-kit/core';
import { sepolia, polygon, base, optimism } from '@account-kit/infra';

import { getDefaultMAV2FactoryAddress } from '@account-kit/smart-contracts';

export const SITE_LOGO = '/grant-logo.png';
export const CREATIVE_LOGO_BLK = '/Blog-Logo_blk.png';
export const CREATIVE_LOGO_WHT = '/Blog-Logo_wht.png';
export const CREATIVE_ICON = '/creative_logo_only.png';
export const SITE_NAME = 'CREATIVE TV';
export const SITE_ORG = 'CREATIVE';
export const SITE_PRODUCT = 'TV';

export const STEPPER_FORM_KEYS = {
  1: ['title', 'description', 'location', 'category'],
  2: ['video'],
  3: ['thumbnail'],
  4: ['sell'],
} as const;

export const CREATIVE_ADDRESS = '0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260';

export const QUARTERLY_PRICES = [
  {
    name: 'Fan',
    features: ['Free-mium Content', 'Creative Influence'],
    info: 'Enjoy content that inspires and elevate your influence!',
    url: 'https://app.unlock-protocol.com/checkout?id=6aa04eef-d516-4c2d-81ad-b797f1dcf3be',
  },
  {
    name: 'Creator',
    price: '$30',
    popular: true,
    features: ['Premium Content', 'Creative Earnings', 'Content Insights'],
    info: 'Unlock premium access and earn as you create.',
    url: 'https://app.unlock-protocol.com/checkout?id=bbbcff5f-835d-4fa3-9761-988d5da9da18',
  },
  {
    name: 'Supporter',
    price: '$300',
    features: [
      'Exclusive Content',
      'Vesting Opportunities',
      'Live Portfolio Analytics',
      'Profit Perks',
      'Personalized Support',
    ],
    info: 'Experience investment exclusivity with top-tier content and insights.',
    url: 'https://app.unlock-protocol.com/checkout?id=7f9da384-5bae-4075-b02b-90bd197df113',
  },
  {
    name: 'Business',
    price: '$750',
    features: [
      'Ad Privileges',
      'Ad Metrics',
      'Referral Rewards',
      'VIP Support',
    ],
    info: 'Amplify your business with advanced ad capabilities tailored for success.',
    url: 'https://app.unlock-protocol.com/checkout?id=8dd13311-7924-4a62-8c7c-5c832d0f3e70',
  },
];

export const ANNUAL_PRICES = [
  {
    name: 'Fan',
    features: ['Free-mium Content', 'Creative Influence'],
    info: 'Enjoy content that inspires and elevate your influence!',
    url: 'https://app.unlock-protocol.com/checkout?id=6aa04eef-d516-4c2d-81ad-b797f1dcf3be',
  },
  {
    name: 'Creator',
    price: '$120',
    popular: true,
    features: ['Premium Content', 'Creative Earnings', 'Content Insights'],
    info: 'Unlock premium access and earn as you create.',
    url: 'https://app.unlock-protocol.com/checkout?id=6808e7ce-909a-4eab-a1eb-d9d72a8ab2b4',
  },
  {
    name: 'Supporter',
    price: '$1200',
    features: [
      'Exclusive Content',
      'Vesting Opportunities',
      'Live Portfolio Analytics',
      'Profit Perks',
      'Personalized Support',
    ],
    info: 'Experience investment exclusivity with top-tier content and insights.',
    url: 'https://app.unlock-protocol.com/checkout?id=95ac51dd-67db-4b62-85c9-27dc393f9c04',
  },
  {
    name: 'Business',
    price: '$3000',
    features: [
      'Ad Privileges',
      'Ad Metrics',
      'Referral Rewards',
      'VIP Support',
    ],
    info: 'Amplify your business with advanced ad capabilities tailored for success.',
    url: 'https://app.unlock-protocol.com/checkout?id=0c0b9948-f155-445e-9485-96b8d8b6bc6a',
  },
];

export const ROLES = {
  sepolia: {
    test: {
      type: 'ERC721',
      chainId: 11155111,
      minToken: '1',
      contractAddress: '0xbc20b339c0dc2793ab4ecece98567f65632015b7',
      roleId: 'tester',
    },
  },
  polygon: {
    contributor: {
      type: 'ERC721',
      chainId: 137,
      minToken: '1',
      contractAddress: '0xb9c69af58109927cc2dcce8043f82158f7b96ca7',
      roleId: 'contributor',
    },
    creator: {
      type: 'ERC721',
      chainId: 137,
      minToken: '1',
      contractAddress: '0xb6b645c3e2025cf69983983266d16a0aa323e2b0',
      roleId: 'creator',
    },
    investor: {
      type: 'ERC721',
      chainId: 137,
      minToken: '1',
      contractAddress: '0xace23c0669bf52c50d30c33c7e4adc78cc8754ec',
      roleId: 'supporter',
    },
    brand: {
      type: 'ERC721',
      chainId: 137,
      minToken: '1',
      contractAddress: '0x480c5081793506ffb8e4a85390e4ac7c19f2d717',
      roleId: 'brand',
    },
    fan: {
      type: 'ERC721',
      chainId: 137,
      minToken: '1',
      contractAddress: '0xe174caa294999ec622988242641a27c11e6c22d8',
      roleId: 'fan',
    },
  },
};

export const ROLES_ABI = [
  {
    inputs: [],
    name: 'CANNOT_APPROVE_SELF',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CANT_BE_SMALLER_THAN_SUPPLY',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CANT_EXTEND_NON_EXPIRING_KEY',
    type: 'error',
  },
  {
    inputs: [],
    name: 'GAS_REFUND_FAILED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'INSUFFICIENT_ERC20_VALUE',
    type: 'error',
  },
  {
    inputs: [],
    name: 'INSUFFICIENT_VALUE',
    type: 'error',
  },
  {
    inputs: [],
    name: 'INVALID_ADDRESS',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: 'hookIndex',
        type: 'uint8',
      },
    ],
    name: 'INVALID_HOOK',
    type: 'error',
  },
  {
    inputs: [],
    name: 'INVALID_LENGTH',
    type: 'error',
  },
  {
    inputs: [],
    name: 'INVALID_TOKEN',
    type: 'error',
  },
  {
    inputs: [],
    name: 'KEY_NOT_VALID',
    type: 'error',
  },
  {
    inputs: [],
    name: 'KEY_TRANSFERS_DISABLED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'LOCK_HAS_CHANGED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'LOCK_SOLD_OUT',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MAX_KEYS_REACHED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MIGRATION_REQUIRED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NON_COMPLIANT_ERC721_RECEIVER',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NON_RENEWABLE_LOCK',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NOT_ENOUGH_FUNDS',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NOT_ENOUGH_TIME',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NOT_READY_FOR_RENEWAL',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NO_SUCH_KEY',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NULL_VALUE',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ONLY_KEY_MANAGER_OR_APPROVED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ONLY_LOCK_MANAGER',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ONLY_LOCK_MANAGER_OR_KEY_GRANTER',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OUT_OF_RANGE',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OWNER_CANT_BE_ADDRESS_ZERO',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SCHEMA_VERSION_NOT_CORRECT',
    type: 'error',
  },
  {
    inputs: [],
    name: 'TRANSFER_TO_SELF',
    type: 'error',
  },
  {
    inputs: [],
    name: 'TransferFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UNAUTHORIZED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UNAUTHORIZED_KEY_MANAGER_UPDATE',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sendTo',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'refund',
        type: 'uint256',
      },
    ],
    name: 'CancelKey',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'onKeyPurchaseHook',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'onKeyCancelHook',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'onValidKeyHook',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'onTokenURIHook',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'onKeyTransferHook',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'onKeyExtendHook',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'onKeyGrantHook',
        type: 'address',
      },
    ],
    name: 'EventHooksUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newExpiration',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'timeAdded',
        type: 'bool',
      },
    ],
    name: 'ExpirationChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'ExpireKey',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'refundValue',
        type: 'uint256',
      },
    ],
    name: 'GasRefundValueChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'refundedAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
    ],
    name: 'GasRefunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint8',
        name: 'version',
        type: 'uint8',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newTimestamp',
        type: 'uint256',
      },
    ],
    name: 'KeyExtended',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'KeyGranterAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'KeyGranterRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_newManager',
        type: 'address',
      },
    ],
    name: 'KeyManagerChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'updatedRecordsCount',
        type: 'uint256',
      },
    ],
    name: 'KeysMigrated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expirationDuration',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxNumberOfKeys',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxKeysPerAcccount',
        type: 'uint256',
      },
    ],
    name: 'LockConfig',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'LockManagerAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'LockManagerRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'symbol',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'baseTokenURI',
        type: 'string',
      },
    ],
    name: 'LockMetadata',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oldKeyPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'keyPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'oldTokenAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
    ],
    name: 'PricingChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'referrer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'fee',
        type: 'uint256',
      },
    ],
    name: 'ReferrerFee',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'freeTrialLength',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'refundPenaltyBasisPoints',
        type: 'uint256',
      },
    ],
    name: 'RefundPenaltyChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32',
      },
    ],
    name: 'RoleAdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'transferFeeBasisPoints',
        type: 'uint256',
      },
    ],
    name: 'TransferFeeChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'lockAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'unlockAddress',
        type: 'address',
      },
    ],
    name: 'UnlockCallFailed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Withdrawal',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'addLockManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_approved',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_keyOwner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'cancelAndRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'expirationDuration',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'expireAndRefundFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_referrer',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'extend',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'freeTrialLength',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'gasRefundValue',
    outputs: [
      {
        internalType: 'uint256',
        name: '_refundValue',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'getApproved',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'getCancelAndRefundValue',
    outputs: [
      {
        internalType: 'uint256',
        name: 'refund',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_keyOwner',
        type: 'address',
      },
    ],
    name: 'getHasValidKey',
    outputs: [
      {
        internalType: 'bool',
        name: 'isValid',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
    ],
    name: 'getRoleAdmin',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_time',
        type: 'uint256',
      },
    ],
    name: 'getTransferFee',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_duration',
        type: 'uint256',
      },
    ],
    name: 'grantKeyExtension',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_recipients',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: '_expirationTimestamps',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: '_keyManagers',
        type: 'address[]',
      },
    ],
    name: 'grantKeys',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasRole',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address payable',
        name: '_lockCreator',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_expirationDuration',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_tokenAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_keyPrice',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxNumberOfKeys',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: '_lockName',
        type: 'string',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'isLockManager',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'isOwner',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_referrer',
        type: 'address',
      },
    ],
    name: 'isRenewable',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'isValidKey',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'keyExpirationTimestampFor',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'keyManagerOf',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'keyPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'lendKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxKeysPerAddress',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxNumberOfKeys',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenIdFrom',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_tokenIdTo',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'mergeKeys',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    name: 'migrate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'numberOfOwners',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onKeyCancelHook',
    outputs: [
      {
        internalType: 'contract ILockKeyCancelHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onKeyExtendHook',
    outputs: [
      {
        internalType: 'contract ILockKeyExtendHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onKeyGrantHook',
    outputs: [
      {
        internalType: 'contract ILockKeyGrantHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onKeyPurchaseHook',
    outputs: [
      {
        internalType: 'contract ILockKeyPurchaseHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onKeyTransferHook',
    outputs: [
      {
        internalType: 'contract ILockKeyTransferHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onTokenURIHook',
    outputs: [
      {
        internalType: 'contract ILockTokenURIHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'onValidKeyHook',
    outputs: [
      {
        internalType: 'contract ILockValidKeyHook',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'ownerOf',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'publicLockVersion',
    outputs: [
      {
        internalType: 'uint16',
        name: '',
        type: 'uint16',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256[]',
        name: '_values',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: '_recipients',
        type: 'address[]',
      },
      {
        internalType: 'address[]',
        name: '_referrers',
        type: 'address[]',
      },
      {
        internalType: 'address[]',
        name: '_keyManagers',
        type: 'address[]',
      },
      {
        internalType: 'bytes[]',
        name: '_data',
        type: 'bytes[]',
      },
    ],
    name: 'purchase',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_referrer',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'purchasePriceFor',
    outputs: [
      {
        internalType: 'uint256',
        name: 'minKeyPrice',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'referrerFees',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'refundPenaltyBasisPoints',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_referrer',
        type: 'address',
      },
    ],
    name: 'renewMembershipFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceLockManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'schemaVersion',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: '_approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_onKeyPurchaseHook',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_onKeyCancelHook',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_onValidKeyHook',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_onTokenURIHook',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_onKeyTransferHook',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_onKeyExtendHook',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_onKeyGrantHook',
        type: 'address',
      },
    ],
    name: 'setEventHooks',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_refundValue',
        type: 'uint256',
      },
    ],
    name: 'setGasRefundValue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_keyManager',
        type: 'address',
      },
    ],
    name: 'setKeyManagerOf',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_lockName',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_lockSymbol',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_baseTokenURI',
        type: 'string',
      },
    ],
    name: 'setLockMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'setOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_referrer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_feeBasisPoint',
        type: 'uint256',
      },
    ],
    name: 'setReferrerFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenIdFrom',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_timeShared',
        type: 'uint256',
      },
    ],
    name: 'shareKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_index',
        type: 'uint256',
      },
    ],
    name: 'tokenByIndex',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_keyOwner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_index',
        type: 'uint256',
      },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'tokenURI',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_keyOwner',
        type: 'address',
      },
    ],
    name: 'totalKeys',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '_totalKeysCreated',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'transferFeeBasisPoints',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'unlendKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unlockProtocol',
    outputs: [
      {
        internalType: 'contract IUnlock',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_keyPrice',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_tokenAddress',
        type: 'address',
      },
    ],
    name: 'updateKeyPricing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_newExpirationDuration',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxNumberOfKeys',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxKeysPerAcccount',
        type: 'uint256',
      },
    ],
    name: 'updateLockConfig',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_freeTrialLength',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_refundPenaltyBasisPoints',
        type: 'uint256',
      },
    ],
    name: 'updateRefundPenalty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'updateSchemaVersion',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_transferFeeBasisPoints',
        type: 'uint256',
      },
    ],
    name: 'updateTransferFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_tokenAddress',
        type: 'address',
      },
      {
        internalType: 'address payable',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
];

export const EditonDropContractDeployedChain = base;

export const MARKETPLACE_ADDRESS = {
  base: '0x6b69543bD0D96041ecB3affECFE1E5d5C9e8DFeC',
};

// Contract Address object to encapsulate all contract related data
export const CONTRACT_ADDRESS = {
  gateway: {
    base: {
      erc20: '0x4B62D9b3DE9FAB98659693c9ee488D2E4eE56c44',
      erc721: '0xf7c4cd399395D80f9d61FDe833849106775269c6',
      erc1155: '0xef5D46A44E24abC76ec1D9fF0C6A57A7BCC29cE0',
    },
    abi: ROLES_ABI,
  },
  meToken: {
    diamondFactory: {
      address: {
        base: '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B',
      },
      abi: [
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
          ],
          name: 'getCurveInfo',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'baseY',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'targetBaseY',
                  type: 'uint256',
                },
                {
                  internalType: 'uint32',
                  name: 'reserveWeight',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: 'targetReserveWeight',
                  type: 'uint32',
                },
              ],
              internalType: 'struct LibCurve.CurveInfo',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'meTokensBurned',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'supply',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'balancePooled',
              type: 'uint256',
            },
          ],
          name: 'viewAssetsReturned',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'supply',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'balancePooled',
              type: 'uint256',
            },
          ],
          name: 'viewMeTokensMinted',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'meTokensBurned',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'supply',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'balancePooled',
              type: 'uint256',
            },
          ],
          name: 'viewTargetAssetsReturned',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'supply',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'balancePooled',
              type: 'uint256',
            },
          ],
          name: 'viewTargetMeTokensMinted',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          anonymous: false,
          inputs: [
            {
              components: [
                {
                  internalType: 'bytes4[]',
                  name: 'functionSelectors',
                  type: 'bytes4[]',
                },
                {
                  internalType: 'address',
                  name: 'facetAddress',
                  type: 'address',
                },
                {
                  internalType: 'enum IDiamondCut.FacetCutAction',
                  name: 'action',
                  type: 'uint8',
                },
              ],
              indexed: false,
              internalType: 'struct IDiamondCut.FacetCut[]',
              name: 'diamondCut',
              type: 'tuple[]',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'init',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'bytes',
              name: 'data',
              type: 'bytes',
            },
          ],
          name: 'DiamondCut',
          type: 'event',
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: 'bytes4[]',
                  name: 'functionSelectors',
                  type: 'bytes4[]',
                },
                {
                  internalType: 'address',
                  name: 'facetAddress',
                  type: 'address',
                },
                {
                  internalType: 'enum IDiamondCut.FacetCutAction',
                  name: 'action',
                  type: 'uint8',
                },
              ],
              internalType: 'struct IDiamondCut.FacetCut[]',
              name: 'cut',
              type: 'tuple[]',
            },
            {
              internalType: 'address',
              name: 'init',
              type: 'address',
            },
            {
              internalType: 'bytes',
              name: 'data',
              type: 'bytes',
            },
          ],
          name: 'diamondCut',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes4',
              name: 'functionSelector',
              type: 'bytes4',
            },
          ],
          name: 'facetAddress',
          outputs: [
            {
              internalType: 'address',
              name: 'facetAddress_',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'facetAddresses',
          outputs: [
            {
              internalType: 'address[]',
              name: 'facetAddresses_',
              type: 'address[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'facet',
              type: 'address',
            },
          ],
          name: 'facetFunctionSelectors',
          outputs: [
            {
              internalType: 'bytes4[]',
              name: 'facetFunctionSelectors_',
              type: 'bytes4[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'facets',
          outputs: [
            {
              components: [
                {
                  internalType: 'address',
                  name: 'facetAddress',
                  type: 'address',
                },
                {
                  internalType: 'bytes4[]',
                  name: 'functionSelectors',
                  type: 'bytes4[]',
                },
              ],
              internalType: 'struct IDiamondLoupeFacet.Facet[]',
              name: 'facets_',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes4',
              name: 'interfaceId',
              type: 'bytes4',
            },
          ],
          name: 'supportsInterface',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'rate',
              type: 'uint256',
            },
          ],
          name: 'SetBurnBuyerFee',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'rate',
              type: 'uint256',
            },
          ],
          name: 'SetBurnOwnerFee',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'rate',
              type: 'uint256',
            },
          ],
          name: 'SetMintFee',
          type: 'event',
        },
        {
          inputs: [],
          name: 'burnBuyerFee',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'burnOwnerFee',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'mintFee',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'rate',
              type: 'uint256',
            },
          ],
          name: 'setBurnBuyerFee',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'rate',
              type: 'uint256',
            },
          ],
          name: 'setBurnOwnerFee',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'rate',
              type: 'uint256',
            },
          ],
          name: 'setMintFee',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'burner',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'meTokensBurned',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'assetsReturned',
              type: 'uint256',
            },
          ],
          name: 'Burn',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'donor',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
          ],
          name: 'Donate',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'depositor',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'meTokensMinted',
              type: 'uint256',
            },
          ],
          name: 'Mint',
          type: 'event',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'meTokensBurned',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
          ],
          name: 'burn',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'meTokensBurned',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'sender',
              type: 'address',
            },
          ],
          name: 'calculateAssetsReturned',
          outputs: [
            {
              internalType: 'uint256',
              name: 'assetsReturned',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
          ],
          name: 'calculateMeTokensMinted',
          outputs: [
            {
              internalType: 'uint256',
              name: 'meTokensMinted',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
          ],
          name: 'donate',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
          ],
          name: 'mint',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
            {
              internalType: 'uint8',
              name: 'vSig',
              type: 'uint8',
            },
            {
              internalType: 'bytes32',
              name: 'rSig',
              type: 'bytes32',
            },
            {
              internalType: 'bytes32',
              name: 'sSig',
              type: 'bytes32',
            },
          ],
          name: 'mintWithPermit',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'CancelUpdate',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'Deactivate',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'FinishUpdate',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'targetRefundRatio',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint32',
              name: 'targetReserveWeight',
              type: 'uint32',
            },
            {
              indexed: false,
              internalType: 'bool',
              name: 'reconfigure',
              type: 'bool',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'startTime',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'endTime',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'endCooldown',
              type: 'uint256',
            },
          ],
          name: 'InitUpdate',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'vault',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'refundRatio',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'baseY',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint32',
              name: 'reserveWeight',
              type: 'uint32',
            },
            {
              indexed: false,
              internalType: 'bytes',
              name: 'encodedVaultArgs',
              type: 'bytes',
            },
          ],
          name: 'Register',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'newOwner',
              type: 'address',
            },
          ],
          name: 'TransferHubOwnership',
          type: 'event',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'cancelUpdate',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'count',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'deactivate',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'finishUpdate',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'getHubInfo',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'startTime',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'endTime',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'endCooldown',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'refundRatio',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'targetRefundRatio',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'vault',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'asset',
                  type: 'address',
                },
                {
                  internalType: 'bool',
                  name: 'updating',
                  type: 'bool',
                },
                {
                  internalType: 'bool',
                  name: 'reconfigure',
                  type: 'bool',
                },
                {
                  internalType: 'bool',
                  name: 'active',
                  type: 'bool',
                },
              ],
              internalType: 'struct HubInfo',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'hubCooldown',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'hubDuration',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'hubWarmup',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'targetRefundRatio',
              type: 'uint256',
            },
            {
              internalType: 'uint32',
              name: 'targetReserveWeight',
              type: 'uint32',
            },
          ],
          name: 'initUpdate',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              internalType: 'contract IVault',
              name: 'vault',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'refundRatio',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'baseY',
              type: 'uint256',
            },
            {
              internalType: 'uint32',
              name: 'reserveWeight',
              type: 'uint32',
            },
            {
              internalType: 'bytes',
              name: 'encodedVaultArgs',
              type: 'bytes',
            },
          ],
          name: 'register',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'cooldown',
              type: 'uint256',
            },
          ],
          name: 'setHubCooldown',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'duration',
              type: 'uint256',
            },
          ],
          name: 'setHubDuration',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'warmup',
              type: 'uint256',
            },
          ],
          name: 'setHubWarmup',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'newOwner',
              type: 'address',
            },
          ],
          name: 'transferHubOwnership',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'CancelResubscribe',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'CancelTransferMeTokenOwnership',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'ClaimMeTokenOwnership',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'FinishResubscribe',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'targetHubId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'migration',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'bytes',
              name: 'encodedMigrationArgs',
              type: 'bytes',
            },
          ],
          name: 'InitResubscribe',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'minted',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'string',
              name: 'name',
              type: 'string',
            },
            {
              indexed: false,
              internalType: 'string',
              name: 'symbol',
              type: 'string',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
          ],
          name: 'Subscribe',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'TransferMeTokenOwnership',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'bool',
              name: 'add',
              type: 'bool',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'UpdateBalanceLocked',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'bool',
              name: 'add',
              type: 'bool',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'UpdateBalancePooled',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'newBalance',
              type: 'uint256',
            },
          ],
          name: 'UpdateBalances',
          type: 'event',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'cancelResubscribe',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'cancelTransferMeTokenOwnership',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'oldOwner',
              type: 'address',
            },
          ],
          name: 'claimMeTokenOwnership',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'finishResubscribe',
          outputs: [
            {
              components: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'hubId',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'balancePooled',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'balanceLocked',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'startTime',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'endTime',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'endCooldown',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'targetHubId',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'migration',
                  type: 'address',
                },
              ],
              internalType: 'struct MeTokenInfo',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
          ],
          name: 'getMeTokenInfo',
          outputs: [
            {
              components: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'hubId',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'balancePooled',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'balanceLocked',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'startTime',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'endTime',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'endCooldown',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'targetHubId',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'migration',
                  type: 'address',
                },
              ],
              internalType: 'struct MeTokenInfo',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
          ],
          name: 'getOwnerMeToken',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'oldOwner',
              type: 'address',
            },
          ],
          name: 'getPendingOwner',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'targetHubId',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'migration',
              type: 'address',
            },
            {
              internalType: 'bytes',
              name: 'encodedMigrationArgs',
              type: 'bytes',
            },
          ],
          name: 'initResubscribe',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
          ],
          name: 'isOwner',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'meTokenCooldown',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'meTokenDuration',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'meTokenWarmup',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'cooldown',
              type: 'uint256',
            },
          ],
          name: 'setMeTokenCooldown',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'duration',
              type: 'uint256',
            },
          ],
          name: 'setMeTokenDuration',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'warmup',
              type: 'uint256',
            },
          ],
          name: 'setMeTokenWarmup',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'string',
              name: 'name',
              type: 'string',
            },
            {
              internalType: 'string',
              name: 'symbol',
              type: 'string',
            },
            {
              internalType: 'uint256',
              name: 'hubId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'assetsDeposited',
              type: 'uint256',
            },
          ],
          name: 'subscribe',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newOwner',
              type: 'address',
            },
          ],
          name: 'transferMeTokenOwnership',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'meToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'newBalance',
              type: 'uint256',
            },
          ],
          name: 'updateBalances',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'deactivateController',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'diamondController',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'durationsController',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'feesController',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'meTokenRegistryController',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'registerController',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newController',
              type: 'address',
            },
          ],
          name: 'setDeactivateController',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newController',
              type: 'address',
            },
          ],
          name: 'setDiamondController',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newController',
              type: 'address',
            },
          ],
          name: 'setDurationsController',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newController',
              type: 'address',
            },
          ],
          name: 'setFeesController',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newController',
              type: 'address',
            },
          ],
          name: 'setMeTokenRegistryController',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'newController',
              type: 'address',
            },
          ],
          name: 'setRegisterController',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'forwarder',
              type: 'address',
            },
          ],
          name: 'setTrustedForwarder',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'trustedForwarder',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    },
    token: {
      address: {
        base: '0xba5502db2aC2cBff189965e991C07109B14eB3f5',
      },
      abi: [
        {
          inputs: [
            {
              internalType: 'string',
              name: 'name_',
              type: 'string',
            },
            {
              internalType: 'string',
              name: 'symbol_',
              type: 'string',
            },
            {
              internalType: 'address',
              name: 'diamondAdr',
              type: 'address',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'constructor',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'Approval',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'Transfer',
          type: 'event',
        },
        {
          inputs: [],
          name: 'DOMAIN_SEPARATOR',
          outputs: [
            {
              internalType: 'bytes32',
              name: '',
              type: 'bytes32',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
          ],
          name: 'allowance',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'approve',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'balanceOf',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'burn',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'burn',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'burnFrom',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'decimals',
          outputs: [
            {
              internalType: 'uint8',
              name: '',
              type: 'uint8',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'subtractedValue',
              type: 'uint256',
            },
          ],
          name: 'decreaseAllowance',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'diamond',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getChainId',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'addedValue',
              type: 'uint256',
            },
          ],
          name: 'increaseAllowance',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'mint',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'name',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
          ],
          name: 'nonces',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
            {
              internalType: 'uint8',
              name: 'v',
              type: 'uint8',
            },
            {
              internalType: 'bytes32',
              name: 'r',
              type: 'bytes32',
            },
            {
              internalType: 'bytes32',
              name: 's',
              type: 'bytes32',
            },
          ],
          name: 'permit',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'symbol',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'totalSupply',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'transfer',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'transferFrom',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'version',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    },
  },
  editionDrop: {
    erc1155: {
      baseSepolia: '0xbbC0bC56f44B744aC159311D9b46a819545F735B',
      amoy: '0xF054c2257dE5Aa336CadA58f13aab1415EEC8266',
      base: '0xef5D46A44E24abC76ec1D9fF0C6A57A7BCC29cE0',
      abi: [
        {
          inputs: [],
          stateMutability: 'nonpayable',
          type: 'constructor',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'index',
              type: 'uint256',
            },
          ],
          name: 'BatchMintInvalidBatchId',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
          ],
          name: 'BatchMintInvalidTokenId',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'batchId',
              type: 'uint256',
            },
          ],
          name: 'BatchMintMetadataFrozen',
          type: 'error',
        },
        {
          inputs: [],
          name: 'ContractMetadataUnauthorized',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'CurrencyTransferLibFailedNativeTransfer',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'expected',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'actual',
              type: 'uint256',
            },
          ],
          name: 'DropClaimExceedLimit',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'expected',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'actual',
              type: 'uint256',
            },
          ],
          name: 'DropClaimExceedMaxSupply',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'expectedCurrency',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'expectedPricePerToken',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'actualCurrency',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'actualExpectedPricePerToken',
              type: 'uint256',
            },
          ],
          name: 'DropClaimInvalidTokenPrice',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'expected',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'actual',
              type: 'uint256',
            },
          ],
          name: 'DropClaimNotStarted',
          type: 'error',
        },
        {
          inputs: [],
          name: 'DropExceedMaxSupply',
          type: 'error',
        },
        {
          inputs: [],
          name: 'DropNoActiveCondition',
          type: 'error',
        },
        {
          inputs: [],
          name: 'DropUnauthorized',
          type: 'error',
        },
        {
          inputs: [],
          name: 'LazyMintInvalidAmount',
          type: 'error',
        },
        {
          inputs: [],
          name: 'LazyMintUnauthorized',
          type: 'error',
        },
        {
          inputs: [],
          name: 'OwnableUnauthorized',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
          ],
          name: 'PermissionsAlreadyGranted',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'expected',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'actual',
              type: 'address',
            },
          ],
          name: 'PermissionsInvalidPermission',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              internalType: 'bytes32',
              name: 'neededRole',
              type: 'bytes32',
            },
          ],
          name: 'PermissionsUnauthorizedAccount',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'max',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'actual',
              type: 'uint256',
            },
          ],
          name: 'PlatformFeeExceededMaxFeeBps',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
          ],
          name: 'PlatformFeeInvalidRecipient',
          type: 'error',
        },
        {
          inputs: [],
          name: 'PlatformFeeUnauthorized',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
          ],
          name: 'PrimarySaleInvalidRecipient',
          type: 'error',
        },
        {
          inputs: [],
          name: 'PrimarySaleUnauthorized',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'max',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'actual',
              type: 'uint256',
            },
          ],
          name: 'RoyaltyExceededMaxFeeBps',
          type: 'error',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
          ],
          name: 'RoyaltyInvalidRecipient',
          type: 'error',
        },
        {
          inputs: [],
          name: 'RoyaltyUnauthorized',
          type: 'error',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'operator',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'bool',
              name: 'approved',
              type: 'bool',
            },
          ],
          name: 'ApprovalForAll',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: '_fromTokenId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: '_toTokenId',
              type: 'uint256',
            },
          ],
          name: 'BatchMetadataUpdate',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'startTimestamp',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'maxClaimableSupply',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'supplyClaimed',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'quantityLimitPerWallet',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes32',
                  name: 'merkleRoot',
                  type: 'bytes32',
                },
                {
                  internalType: 'uint256',
                  name: 'pricePerToken',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'currency',
                  type: 'address',
                },
                {
                  internalType: 'string',
                  name: 'metadata',
                  type: 'string',
                },
              ],
              indexed: false,
              internalType: 'struct IClaimCondition.ClaimCondition[]',
              name: 'claimConditions',
              type: 'tuple[]',
            },
            {
              indexed: false,
              internalType: 'bool',
              name: 'resetEligibility',
              type: 'bool',
            },
          ],
          name: 'ClaimConditionsUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'string',
              name: 'prevURI',
              type: 'string',
            },
            {
              indexed: false,
              internalType: 'string',
              name: 'newURI',
              type: 'string',
            },
          ],
          name: 'ContractURIUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'newRoyaltyRecipient',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'newRoyaltyBps',
              type: 'uint256',
            },
          ],
          name: 'DefaultRoyalty',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'platformFeeRecipient',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'flatFee',
              type: 'uint256',
            },
          ],
          name: 'FlatPlatformFeeUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint8',
              name: 'version',
              type: 'uint8',
            },
          ],
          name: 'Initialized',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'maxTotalSupply',
              type: 'uint256',
            },
          ],
          name: 'MaxTotalSupplyUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [],
          name: 'MetadataFrozen',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'prevOwner',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'newOwner',
              type: 'address',
            },
          ],
          name: 'OwnerUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'platformFeeRecipient',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'platformFeeBps',
              type: 'uint256',
            },
          ],
          name: 'PlatformFeeInfoUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'enum IPlatformFee.PlatformFeeType',
              name: 'feeType',
              type: 'uint8',
            },
          ],
          name: 'PlatformFeeTypeUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
          ],
          name: 'PrimarySaleRecipientUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              indexed: true,
              internalType: 'bytes32',
              name: 'previousAdminRole',
              type: 'bytes32',
            },
            {
              indexed: true,
              internalType: 'bytes32',
              name: 'newAdminRole',
              type: 'bytes32',
            },
          ],
          name: 'RoleAdminChanged',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'sender',
              type: 'address',
            },
          ],
          name: 'RoleGranted',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'sender',
              type: 'address',
            },
          ],
          name: 'RoleRevoked',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'royaltyRecipient',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'royaltyBps',
              type: 'uint256',
            },
          ],
          name: 'RoyaltyForToken',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'saleRecipient',
              type: 'address',
            },
          ],
          name: 'SaleRecipientForTokenUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'uint256',
              name: 'claimConditionIndex',
              type: 'uint256',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'claimer',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'receiver',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'quantityClaimed',
              type: 'uint256',
            },
          ],
          name: 'TokensClaimed',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'uint256',
              name: 'startTokenId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'endTokenId',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'string',
              name: 'baseURI',
              type: 'string',
            },
            {
              indexed: false,
              internalType: 'bytes',
              name: 'encryptedBaseURI',
              type: 'bytes',
            },
          ],
          name: 'TokensLazyMinted',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'operator',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256[]',
              name: 'ids',
              type: 'uint256[]',
            },
            {
              indexed: false,
              internalType: 'uint256[]',
              name: 'values',
              type: 'uint256[]',
            },
          ],
          name: 'TransferBatch',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'operator',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'TransferSingle',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'string',
              name: 'value',
              type: 'string',
            },
            {
              indexed: true,
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'URI',
          type: 'event',
        },
        {
          inputs: [],
          name: 'DEFAULT_ADMIN_ROLE',
          outputs: [
            {
              internalType: 'bytes32',
              name: '',
              type: 'bytes32',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
          ],
          name: 'balanceOf',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: 'accounts',
              type: 'address[]',
            },
            {
              internalType: 'uint256[]',
              name: 'ids',
              type: 'uint256[]',
            },
          ],
          name: 'balanceOfBatch',
          outputs: [
            {
              internalType: 'uint256[]',
              name: '',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          name: 'batchFrozen',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              internalType: 'uint256[]',
              name: 'ids',
              type: 'uint256[]',
            },
            {
              internalType: 'uint256[]',
              name: 'values',
              type: 'uint256[]',
            },
          ],
          name: 'burnBatch',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_receiver',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_quantity',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_currency',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_pricePerToken',
              type: 'uint256',
            },
            {
              components: [
                {
                  internalType: 'bytes32[]',
                  name: 'proof',
                  type: 'bytes32[]',
                },
                {
                  internalType: 'uint256',
                  name: 'quantityLimitPerWallet',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'pricePerToken',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'currency',
                  type: 'address',
                },
              ],
              internalType: 'struct IDrop1155.AllowlistProof',
              name: '_allowlistProof',
              type: 'tuple',
            },
            {
              internalType: 'bytes',
              name: '_data',
              type: 'bytes',
            },
          ],
          name: 'claim',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          name: 'claimCondition',
          outputs: [
            {
              internalType: 'uint256',
              name: 'currentStartId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'count',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'contractType',
          outputs: [
            {
              internalType: 'bytes32',
              name: '',
              type: 'bytes32',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [],
          name: 'contractURI',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'contractVersion',
          outputs: [
            {
              internalType: 'uint8',
              name: '',
              type: 'uint8',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_index',
              type: 'uint256',
            },
          ],
          name: 'freezeBatchBaseURI',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
          ],
          name: 'getActiveClaimConditionId',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getBaseURICount',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_index',
              type: 'uint256',
            },
          ],
          name: 'getBatchIdAtIndex',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_conditionId',
              type: 'uint256',
            },
          ],
          name: 'getClaimConditionById',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'startTimestamp',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'maxClaimableSupply',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'supplyClaimed',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'quantityLimitPerWallet',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes32',
                  name: 'merkleRoot',
                  type: 'bytes32',
                },
                {
                  internalType: 'uint256',
                  name: 'pricePerToken',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'currency',
                  type: 'address',
                },
                {
                  internalType: 'string',
                  name: 'metadata',
                  type: 'string',
                },
              ],
              internalType: 'struct IClaimCondition.ClaimCondition',
              name: 'condition',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getDefaultRoyaltyInfo',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
            {
              internalType: 'uint16',
              name: '',
              type: 'uint16',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getFlatPlatformFeeInfo',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getPlatformFeeInfo',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
            {
              internalType: 'uint16',
              name: '',
              type: 'uint16',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getPlatformFeeType',
          outputs: [
            {
              internalType: 'enum IPlatformFee.PlatformFeeType',
              name: '',
              type: 'uint8',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
          ],
          name: 'getRoleAdmin',
          outputs: [
            {
              internalType: 'bytes32',
              name: '',
              type: 'bytes32',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'uint256',
              name: 'index',
              type: 'uint256',
            },
          ],
          name: 'getRoleMember',
          outputs: [
            {
              internalType: 'address',
              name: 'member',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
          ],
          name: 'getRoleMemberCount',
          outputs: [
            {
              internalType: 'uint256',
              name: 'count',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
          ],
          name: 'getRoyaltyInfoForToken',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
            {
              internalType: 'uint16',
              name: '',
              type: 'uint16',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_conditionId',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_claimer',
              type: 'address',
            },
          ],
          name: 'getSupplyClaimedByWallet',
          outputs: [
            {
              internalType: 'uint256',
              name: 'supplyClaimedByWallet',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'grantRole',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'hasRole',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'hasRoleWithSwitch',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_defaultAdmin',
              type: 'address',
            },
            {
              internalType: 'string',
              name: '_name',
              type: 'string',
            },
            {
              internalType: 'string',
              name: '_symbol',
              type: 'string',
            },
            {
              internalType: 'string',
              name: '_contractURI',
              type: 'string',
            },
            {
              internalType: 'address[]',
              name: '_trustedForwarders',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: '_saleRecipient',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_royaltyRecipient',
              type: 'address',
            },
            {
              internalType: 'uint128',
              name: '_royaltyBps',
              type: 'uint128',
            },
            {
              internalType: 'uint128',
              name: '_platformFeeBps',
              type: 'uint128',
            },
            {
              internalType: 'address',
              name: '_platformFeeRecipient',
              type: 'address',
            },
          ],
          name: 'initialize',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'operator',
              type: 'address',
            },
          ],
          name: 'isApprovedForAll',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'forwarder',
              type: 'address',
            },
          ],
          name: 'isTrustedForwarder',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_amount',
              type: 'uint256',
            },
            {
              internalType: 'string',
              name: '_baseURIForTokens',
              type: 'string',
            },
            {
              internalType: 'bytes',
              name: '_data',
              type: 'bytes',
            },
          ],
          name: 'lazyMint',
          outputs: [
            {
              internalType: 'uint256',
              name: 'batchId',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          name: 'maxTotalSupply',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes[]',
              name: 'data',
              type: 'bytes[]',
            },
          ],
          name: 'multicall',
          outputs: [
            {
              internalType: 'bytes[]',
              name: 'results',
              type: 'bytes[]',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'name',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'nextTokenIdToMint',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'owner',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'primarySaleRecipient',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'renounceRole',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'revokeRole',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'tokenId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'salePrice',
              type: 'uint256',
            },
          ],
          name: 'royaltyInfo',
          outputs: [
            {
              internalType: 'address',
              name: 'receiver',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'royaltyAmount',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256[]',
              name: 'ids',
              type: 'uint256[]',
            },
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
            {
              internalType: 'bytes',
              name: 'data',
              type: 'bytes',
            },
          ],
          name: 'safeBatchTransferFrom',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'id',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
            {
              internalType: 'bytes',
              name: 'data',
              type: 'bytes',
            },
          ],
          name: 'safeTransferFrom',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          name: 'saleRecipient',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'operator',
              type: 'address',
            },
            {
              internalType: 'bool',
              name: 'approved',
              type: 'bool',
            },
          ],
          name: 'setApprovalForAll',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'startTimestamp',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'maxClaimableSupply',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'supplyClaimed',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'quantityLimitPerWallet',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes32',
                  name: 'merkleRoot',
                  type: 'bytes32',
                },
                {
                  internalType: 'uint256',
                  name: 'pricePerToken',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'currency',
                  type: 'address',
                },
                {
                  internalType: 'string',
                  name: 'metadata',
                  type: 'string',
                },
              ],
              internalType: 'struct IClaimCondition.ClaimCondition[]',
              name: '_conditions',
              type: 'tuple[]',
            },
            {
              internalType: 'bool',
              name: '_resetClaimEligibility',
              type: 'bool',
            },
          ],
          name: 'setClaimConditions',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'string',
              name: '_uri',
              type: 'string',
            },
          ],
          name: 'setContractURI',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_royaltyRecipient',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_royaltyBps',
              type: 'uint256',
            },
          ],
          name: 'setDefaultRoyaltyInfo',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_platformFeeRecipient',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_flatFee',
              type: 'uint256',
            },
          ],
          name: 'setFlatPlatformFeeInfo',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_maxTotalSupply',
              type: 'uint256',
            },
          ],
          name: 'setMaxTotalSupply',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_newOwner',
              type: 'address',
            },
          ],
          name: 'setOwner',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_platformFeeRecipient',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_platformFeeBps',
              type: 'uint256',
            },
          ],
          name: 'setPlatformFeeInfo',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'enum IPlatformFee.PlatformFeeType',
              name: '_feeType',
              type: 'uint8',
            },
          ],
          name: 'setPlatformFeeType',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_saleRecipient',
              type: 'address',
            },
          ],
          name: 'setPrimarySaleRecipient',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_recipient',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_bps',
              type: 'uint256',
            },
          ],
          name: 'setRoyaltyInfoForToken',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_saleRecipient',
              type: 'address',
            },
          ],
          name: 'setSaleRecipientForToken',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes4',
              name: 'interfaceId',
              type: 'bytes4',
            },
          ],
          name: 'supportsInterface',
          outputs: [
            {
              internalType: 'bool',
              name: '',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'symbol',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          name: 'totalSupply',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_index',
              type: 'uint256',
            },
            {
              internalType: 'string',
              name: '_uri',
              type: 'string',
            },
          ],
          name: 'updateBatchBaseURI',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
          ],
          name: 'uri',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_conditionId',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_claimer',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_tokenId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_quantity',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_currency',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_pricePerToken',
              type: 'uint256',
            },
            {
              components: [
                {
                  internalType: 'bytes32[]',
                  name: 'proof',
                  type: 'bytes32[]',
                },
                {
                  internalType: 'uint256',
                  name: 'quantityLimitPerWallet',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'pricePerToken',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'currency',
                  type: 'address',
                },
              ],
              internalType: 'struct IDrop1155.AllowlistProof',
              name: '_allowlistProof',
              type: 'tuple',
            },
          ],
          name: 'verifyClaim',
          outputs: [
            {
              internalType: 'bool',
              name: 'isOverride',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    },
  },
  erc20: {
    USDC: {
      chain: {
        polygon: {
          amoy: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
          mainnet: '',
        },
        ethereum: {
          mainnet: '',
          sepolia: '',
        },
        base: {
          baseSepolia: '',
          mainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        },
      },
    },
    POL: {
      chain: {
        polygon: {
          amoy: '0x0000000000000000000000000000000000001010',
          mainnet: '0x0000000000000000000000000000000000001010',
        },
        ethereum: {
          sepolia: '',
          mainnet: '',
        },
      },
    },
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'name',
        outputs: [
          {
            name: '',
            type: 'string',
          },
        ],
        payable: false,
        type: 'function',
      },
      {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [
          {
            name: '',
            type: 'uint8',
          },
        ],
        payable: false,
        type: 'function',
      },
      {
        constant: true,
        inputs: [
          {
            name: '_owner',
            type: 'address',
          },
        ],
        name: 'balanceOf',
        outputs: [
          {
            name: 'balance',
            type: 'uint256',
          },
        ],
        payable: false,
        type: 'function',
      },
      {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [
          {
            name: '',
            type: 'string',
          },
        ],
        payable: false,
        type: 'function',
      },
      {
        constant: false,
        inputs: [
          {
            name: '_spender',
            type: 'address',
          },
          {
            name: '_value',
            type: 'uint256',
          },
        ],
        name: 'approve',
        outputs: [
          {
            name: '',
            type: 'bool',
          },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        constant: false,
        inputs: [
          {
            name: '_to',
            type: 'address',
          },
          {
            name: '_value',
            type: 'uint256',
          },
        ],
        name: 'transfer',
        outputs: [
          {
            name: '',
            type: 'bool',
          },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'spender',
            type: 'address',
          },
        ],
        name: 'allowance',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ],
  },
};

export const blockExplorer = {
  base: {
    mainnet: 'https://basescan.org',
    baseSepolia: 'https://sepolia.basescan.org',
  },
  polygon: {
    mainnet: 'https://polygonscan.com',
    amoy: 'https://amoy.polygonscan.com',
  },
};
// FOOTER
const currentYear = new Date().getFullYear();

export const FOOTER_LINKS = {
  whitepaper: 'https://creativeplatform.xyz/docs/resources/whitepaper',
  blog: 'https://blog.creativeplatform.xyz',
  about_us: 'https://creativeplatform.xyz/docs/intro',
  releases: 'https://creative-org-dao.canny.io/changelog',
  pricing: '/pricing',
  tutorial: 'https://crew3.xyz/c/thecreativedao/questboard',
  cookie_policy: 'https://creativeplatform.xyz/docs/cookie-policy',
  privacy_policy: 'https://creativeplatform.xyz/docs/privacy-policy',
  terms_and_conditions:
    'https://creativeplatform.xyz/docs/terms-and-conditions',
  status:
    'https://thecreative.grafana.net/public-dashboards/0d59c3754efd4cf5be8298ff3b24b685?orgId=1',
  terminal: 'https://app.creativeplatform.xyz',
};

export const SITE_COPYRIGHT = `© ${currentYear} Creative Organization DAO, LLC. All rights reserved.`;

// LINKS
export const SOCIAL_LINKS = {
  twitter: 'https://twitter.com/creativecrtv',
  github: 'https://github.com/creativeplatform',
  discord: 'https://discord.com/servers/creative-779364937503604777',
  lens: 'https://lensfrens.xyz/thecreative',
  linkedin: 'https://www.linkedin.com/company/creativeplatform',
  instagram: 'https://www.instagram.com/creativecrtv/',
  warpcast: 'https://warpcast.com/thecreative.eth',
  email: 'mailto:creatives@creativeplatform.xyz',
};

// Profile.tsx
export const PFP = '/0.png';

export const PROFILE_VIDEOS = {
  tooltip: 'list of your uploaded videos',
  tooltip_position: 'bottom',
};

export const PROFILE_CAMPAIGNS = {
  tooltip: 'list of your campaigns',
  tooltip_position: 'bottom',
};

// Livepeer API
export const LIVEPEER_FULL_API_URL = 'https://livepeer.com/api';

// HERO
export const HERO_VIDEO_TITLE = 'Welcome To Creative Organization DAO';
export const LIVEPEER_HERO_PLAYBACK_ID = 'cbd1dw72qst9xmps';

// FEATURED VIDEO
export const FEATURED_VIDEO_TITLE = 'The Creative Podcast Episode 03';
export const LIVEPEER_FEATURED_PLAYBACK_ID = '5c2bzf537qbq0r7o';

// HERO SECTION
export const HERO_NAME = {
  top: 'Record Once,',
  bottom: 'Use Everywhere!',
};

export const HERO_DESCRIPTION = `${SITE_NAME} is a decentralized live-streaming platform that puts you in control of your content and earnings. Get paid 100% of streaming revenue, have access to your own social token, and monetize your content into NFTs.`;

export const HERO_BUTTONS = {
  primary: {
    text: 'Get Started',
    href: 'https://app.unlock-protocol.com/checkout?id=bbbcff5f-835d-4fa3-9761-988d5da9da18',
  },
  secondary: {
    text: 'How It Works',
    href: 'https://creativeplatform.xyz/docs/intro',
    target: '_blank',
  },
};

export const HERO_IMAGE =
  'https://bafybeiefwmq6zykvyhwih5qbhucxrc34zbtxjbwboz7hdgkyh3u6p2ykfa.ipfs.nftstorage.link';

// FEATURED VIDEO
export const FEATURED_TEXT = {
  top: 'Record. Watch. Brand.',
  middle: 'Stream. Create. Inspire.',
  bottom: 'Engage. Dream. Earn.',
};

// URLS
export const API_BASE_URL = 'https://api.poap.tech';
export const APP_BASE_URL = 'https://app.poap.xyz';

// SPACE
export const SNAPSHOT_SPACE = 'thecreative.eth';

// STATES
export const NO_POAP = 'NO_POAP';
export const NOT_VOTED = 'NOT_VOTED';
export const LOADING = 'LOADING';
export const UNCLAIMED = 'UNCLAIMED';
export const CLAIMED = 'CLAIMED';

type State =
  | typeof NO_POAP
  | typeof NOT_VOTED
  | typeof LOADING
  | typeof UNCLAIMED
  | typeof CLAIMED;
type States = { [S in State]: Record<string, any> };
export const STATES: States = {
  NO_POAP: {
    header: "A POAP hasn't been setup for this proposal yet :'(",
    headerImage: 'https://snapshotsplugin.s3.us-west-2.amazonaws.com/empty.svg',
    mainImage:
      'https://snapshotsplugin.s3.us-west-2.amazonaws.com/placeholder.png',
  },
  NOT_VOTED: {
    headerImage: 'https://snapshotsplugin.s3.us-west-2.amazonaws.com/vote.svg',
    header: 'Vote to get this POAP',
    buttonText: 'Mint',
  },
  UNCLAIMED: {
    headerImage: 'https://snapshotsplugin.s3.us-west-2.amazonaws.com/claim.svg',
    header: 'Mint your I voted POAP',
    buttonText: 'Mint',
  },
  CLAIMED: {
    headerImage:
      'https://snapshotsplugin.s3.us-west-2.amazonaws.com/succes.svg',
    header: 'Congratulations! The POAP has been minted to your collection',
    buttonText: 'Browse collection',
  },
  LOADING: {
    headerImage:
      'https://snapshotsplugin.s3.us-west-2.amazonaws.com/succes.svg',
    header: 'The POAP is being minted to your collection',
    buttonText: '',
  },
};

export const ACCOUNT_FACTORY_ADDRESS = {
  sepolia: '0x9406Cc6185a346906296840746125a0E44976454',
  polygon: '0x9406Cc6185a346906296840746125a0E44976454',
  base: '0x9406Cc6185a346906296840746125a0E44976454',
  optimism: '0x9406Cc6185a346906296840746125a0E44976454',
};
