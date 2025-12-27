#!/bin/bash

# StoryScan Contract Verification Script using Foundry
# 
# This script uses Foundry's built-in verify-contract command to verify
# the CreatorIPCollectionFactory contract on StoryScan (Blockscout)
#
# Usage:
#   ./scripts/verify-factory-foundry.sh
#
# Environment Variables:
#   NEXT_STORYSCAN_API_KEY - StoryScan API key (optional, may be required)
#   NEXT_PUBLIC_STORY_NETWORK - "testnet" (default) or "mainnet"
#   FACTORY_ADDRESS - Contract address to verify (optional, uses latest deployment)

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Configuration
STORY_NETWORK=${NEXT_PUBLIC_STORY_NETWORK:-mainnet}
FACTORY_ADDRESS=${FACTORY_ADDRESS:-"0xD17C79631eAE76270ea2ACe8d107C258dfC77397"}

# RPC URLs
if [ "$STORY_NETWORK" = "mainnet" ]; then
  RPC_URL="https://homer.storyrpc.io"
  VERIFIER_URL="https://www.storyscan.io/api/"
  CHAIN_ID=1514
else
  RPC_URL="https://aeneid.storyrpc.io"
  VERIFIER_URL="https://testnet.storyscan.io/api/"
  CHAIN_ID=1315
fi

# Contract details
CONTRACT_FILE="contracts/CreatorIPCollectionFactory.sol"
CONTRACT_NAME="CreatorIPCollectionFactory"

echo "🔍 StoryScan Contract Verification (Foundry)"
echo "=============================================="
echo "📡 Network: $STORY_NETWORK"
echo "📍 Contract Address: $FACTORY_ADDRESS"
echo "🔗 RPC URL: $RPC_URL"
echo "🔗 Verifier URL: $VERIFIER_URL"
echo ""

# Check if forge is installed
if ! command -v forge &> /dev/null; then
  echo "❌ Foundry (forge) is not installed"
  echo "   Install it from: https://book.getfoundry.sh/getting-started/installation"
  exit 1
fi

# Check if contract is compiled
if [ ! -f "out/CreatorIPCollectionFactory.sol/CreatorIPCollectionFactory.json" ]; then
  echo "📦 Compiling contracts..."
  forge build --contracts "$CONTRACT_FILE"
fi

# Get constructor arguments from deployment file
echo "📋 Getting constructor arguments from deployment..."
DEPLOYMENT_FILE=$(find deployments -name "factory-${STORY_NETWORK}-*.json" | sort -r | head -1)

if [ -z "$DEPLOYMENT_FILE" ]; then
  echo "⚠️  No deployment file found, using empty constructor arguments"
  CONSTRUCTOR_ARGS=""
else
  echo "   Found deployment file: $DEPLOYMENT_FILE"
  
  # Extract constructor arguments from deployment
  OWNER=$(jq -r '.owner' "$DEPLOYMENT_FILE")
  CONTRACT_URI=$(jq -r '.config.defaultContractURI' "$DEPLOYMENT_FILE")
  ROYALTY_RECIPIENT=$(jq -r '.config.defaultRoyaltyRecipient' "$DEPLOYMENT_FILE")
  ROYALTY_BPS=$(jq -r '.config.defaultRoyaltyBps' "$DEPLOYMENT_FILE")
  PLATFORM_FEE_RECIPIENT=$(jq -r '.config.defaultPlatformFeeRecipient' "$DEPLOYMENT_FILE")
  PLATFORM_FEE_BPS=$(jq -r '.config.defaultPlatformFeeBps' "$DEPLOYMENT_FILE")
  TRUSTED_FORWARDERS=$(jq -r '.config.trustedForwarders[]' "$DEPLOYMENT_FILE" | tr '\n' ',' | sed 's/,$//')
  
  # Get collection bytecode hash
  if [ -f "out/CreatorIPCollection.sol/TokenERC721.json" ]; then
    BYTECODE=$(jq -r '.bytecode.object' "out/CreatorIPCollection.sol/TokenERC721.json")
    # Compute keccak256 hash (using node for simplicity)
    BYTECODE_HASH=$(node -e "const { keccak256 } = require('viem'); console.log(keccak256('$BYTECODE'))" 2>/dev/null || echo "0x0000000000000000000000000000000000000000000000000000000000000000")
  else
    echo "⚠️  TokenERC721 bytecode not found, using zero hash"
    BYTECODE_HASH="0x0000000000000000000000000000000000000000000000000000000000000000"
  fi
  
  # Format trusted forwarders array
  if [ -z "$TRUSTED_FORWARDERS" ]; then
    FORWARDERS_ARRAY="[]"
  else
    FORWARDERS_ARRAY="[$(echo "$TRUSTED_FORWARDERS" | sed 's/,/, /g')]"
  fi
  
  # Encode constructor arguments using cast
  echo "   Encoding constructor arguments..."
  CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,string,address,uint128,address,uint128,address[],bytes32)" \
    "$OWNER" \
    "$CONTRACT_URI" \
    "$ROYALTY_RECIPIENT" \
    "$ROYALTY_BPS" \
    "$PLATFORM_FEE_RECIPIENT" \
    "$PLATFORM_FEE_BPS" \
    "$FORWARDERS_ARRAY" \
    "$BYTECODE_HASH" 2>/dev/null || echo "")
  
  if [ -z "$CONSTRUCTOR_ARGS" ]; then
    echo "⚠️  Could not encode constructor arguments, using empty"
    CONSTRUCTOR_ARGS=""
  else
    echo "   ✅ Constructor arguments encoded"
  fi
fi

echo ""
echo "🚀 Verifying contract..."
echo ""

# Build the verify command
VERIFY_CMD="forge verify-contract \
  --rpc-url $RPC_URL \
  --verifier blockscout \
  --verifier-url '$VERIFIER_URL' \
  --chain-id $CHAIN_ID \
  $FACTORY_ADDRESS \
  $CONTRACT_FILE:$CONTRACT_NAME"

# Add constructor arguments if available
if [ -n "$CONSTRUCTOR_ARGS" ]; then
  VERIFY_CMD="$VERIFY_CMD --constructor-args $CONSTRUCTOR_ARGS"
fi

# Add API key if available
if [ -n "$NEXT_STORYSCAN_API_KEY" ]; then
  VERIFY_CMD="$VERIFY_CMD --etherscan-api-key $NEXT_STORYSCAN_API_KEY"
fi

# Add compiler version and optimization settings
VERIFY_CMD="$VERIFY_CMD \
  --compiler-version 0.8.20 \
  --optimizer-runs 200"

echo "Running command:"
echo "$VERIFY_CMD"
echo ""

# Execute verification
eval $VERIFY_CMD

echo ""
echo "✅ Verification submitted!"
echo "🔗 Check status at: https://www.storyscan.io/address/$FACTORY_ADDRESS"

