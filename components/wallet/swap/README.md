# Alchemy Swap Integration

This directory contains components for integrating Alchemy's swap functionality with the three supported tokens on Base: ETH, USDC, and DAI.

## Components

### AlchemySwapWidget
A comprehensive swap widget that supports all token pairs (ETH ↔ USDC ↔ DAI).

**Features:**
- Real-time quote fetching
- Token selection dropdowns
- Amount input with automatic quote updates
- Gas sponsorship via paymaster
- Transaction status tracking
- Error handling and user feedback

### DaiSwapButton
A specialized component for swapping to DAI specifically.

**Features:**
- Swap from ETH or USDC to DAI
- Simplified interface
- Same core functionality as the full widget

### SwapDemo
A demo component showcasing both swap interfaces.

## Usage

```tsx
import { AlchemySwapWidget, DaiSwapButton } from '@/components/wallet/swap';

// Full swap widget
<AlchemySwapWidget 
  onSwapSuccess={() => console.log('Swap completed!')}
  className="w-full"
/>

// DAI-specific swap
<DaiSwapButton 
  onSwapSuccess={() => console.log('DAI swap completed!')}
  className="w-full"
/>
```

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID=your_paymaster_policy_id
```

### Token Addresses (Base Mainnet)
- **ETH**: `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee` (native token)
- **USDC**: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
- **DAI**: `0x50c5725949a6f0c72e6c4a641f24049a917db0cb`

## How It Works

1. **Quote Request**: User enters amount, component requests quote from Alchemy API
2. **Quote Display**: Shows expected output amount and exchange rate
3. **Transaction Signing**: Uses Account Kit to sign the swap transaction
4. **Execution**: Sends prepared calls via Alchemy's API
5. **Tracking**: Monitors transaction status until completion

## API Integration

The swap functionality uses Alchemy's Smart Wallet API:

- `wallet_requestQuote_v0`: Get swap quotes
- `wallet_sendPreparedCalls`: Execute signed transactions
- `wallet_getCallsStatus`: Track transaction status

## Error Handling

The components handle various error scenarios:
- Invalid amounts
- Insufficient balance
- Network errors
- Transaction failures
- RPC errors

## Gas Sponsorship

When a paymaster policy ID is configured, gas fees can be sponsored, allowing for gasless swaps.

## Dependencies

- `@account-kit/react`: Smart wallet integration
- `viem`: Blockchain utilities
- `@/components/ui/*`: UI components
