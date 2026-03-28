# Deploy Subgraph from Contract Address, Start Block, and ABI

## Overview

Since the IPFS hash isn't accessible, we'll deploy the subgraph using the `--from-abi` option with the contract address, start block, and ABI.

## Required Information

### Contract Address
```
0xba5502db2aC2cBff189965e991C07109B14eB3f5
```
This is the MeToken Diamond contract on Base Mainnet.

### Start Block
```
16584535
```
This is the block where the contract was deployed (from the existing subgraph status).

### Network
```
base
```
Base Mainnet.

## Step 1: Prepare the ABI File

The ABI needs to include all events that the subgraph indexes:
- `Subscribe` - MeToken creation events
- `Mint` - Minting events
- `Burn` - Burning events
- `Register` - Registration events (if applicable)

Create a file `metoken-abi.json` with the ABI. The ABI should include at minimum these events:

```json
[
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "meToken", "type": "address"},
      {"indexed": true, "name": "owner", "type": "address"},
      {"indexed": false, "name": "minted", "type": "uint256"},
      {"indexed": false, "name": "asset", "type": "address"},
      {"indexed": false, "name": "assetsDeposited", "type": "uint256"},
      {"indexed": false, "name": "name", "type": "string"},
      {"indexed": false, "name": "symbol", "type": "string"},
      {"indexed": false, "name": "hubId", "type": "uint256"}
    ],
    "name": "Subscribe",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "meToken", "type": "address"},
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "meTokenAmount", "type": "uint256"},
      {"indexed": false, "name": "collateralAmount", "type": "uint256"}
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "meToken", "type": "address"},
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "meTokenAmount", "type": "uint256"},
      {"indexed": false, "name": "collateralAmount", "type": "uint256"}
    ],
    "name": "Burn",
    "type": "event"
  }
]
```

**Note:** For a complete subgraph, you'll want the full ABI from `lib/contracts/MeToken.ts`. The `--from-abi` option will generate a basic subgraph automatically, but you may need to customize it.

## Step 2: Deploy Subgraph via Dashboard (Recommended)

The CLI `--from-abi` option may require additional configuration. Since you need to specify contract address, start block, and ABI, use the **Goldsky Dashboard** method:

## Step 3: Deploy via Dashboard

1. **Go to Goldsky Dashboard:**
   - Navigate to: https://app.goldsky.com/dashboard
   - Login to your account
   - Go to "Subgraphs" section

2. **Delete Old Subgraph (if needed):**
   - Find `metokens/v0.0.1` (the broken one)
   - Click on it and delete it

3. **Create New Subgraph:**
   - Click "New Subgraph" or "Deploy Subgraph" button
   - Select "Deploy from ABI" or "Generate from Contract" option

4. **Enter Deployment Details:**
   - **Subgraph Name**: `metokens`
   - **Version**: `v0.0.2`
   - **Network**: `base` (Base Mainnet)
   - **Contract Address**: `0xba5502db2aC2cBff189965e991C07109B14eB3f5`
   - **Start Block**: `16584535`
   - **ABI**: 
     - Option A: Upload the `metoken-abi.json` file
     - Option B: Copy and paste the JSON content from `metoken-abi.json`

5. **Review and Deploy:**
   - Review all the details
   - Click "Deploy" or "Create"
   - Wait for deployment to start

**Note:** The dashboard will automatically generate the subgraph schema and handlers from the ABI. It will create entities for the 4 events: `Subscribe`, `Mint`, `Burn`, and `Register`.

## Step 4: Alternative - Try CLI with Full Path

If you want to try CLI again, use the full absolute path:

```bash
cd /Users/sirgawain/Developer/crtv3

# Try with absolute path
goldsky subgraph deploy metokens/v0.0.2 \
  --from-abi /Users/sirgawain/Developer/crtv3/metoken-abi.json \
  --start-block 16584535 \
  --description "Fresh deployment for Mirror pipeline - deployed from ABI"
```

**Note:** If this still fails with "Unknown config version", use the dashboard method instead.

## Step 5: Verify Deployment

After deployment, verify the subgraph:

```bash
# Check subgraph status
goldsky subgraph list metokens/v0.0.2

# Test the endpoint
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 1) { id meToken hubId blockTimestamp } }"
  }'
```

## Step 6: Deploy Mirror Pipeline

Once the subgraph is healthy, deploy the Mirror pipeline:

```bash
# Validate pipeline (already configured for v0.0.2)
goldsky pipeline validate pipeline-metokens-all.yaml

# Deploy the pipeline
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

## Important Notes

### ABI Requirements

The `--from-abi` option will automatically generate a basic subgraph schema and handlers. However:

1. **It may not include all events** - You may need to manually add handlers for `Mint`, `Burn`, and `Register` events
2. **Schema customization** - The auto-generated schema might need adjustments
3. **Handler logic** - You may need to customize the handlers for your specific use case

### Full ABI Location

The complete ABI is in:
- `lib/contracts/MeToken.ts` - Full Diamond contract ABI

You can extract just the events you need, or use the full ABI (it will work, just includes more than necessary).

### Start Block Verification

The start block `16584535` is from the existing subgraph. To verify:
- Check Basescan for contract deployment: https://basescan.org/address/0xba5502db2aC2cBff189965e991C07109B14eB3f5
- Look for the contract creation transaction
- Use that block number as the start block

## Troubleshooting

### ABI File Not Found

**Error**: `Cannot find ABI file`

**Solution**: 
- Ensure the file path is correct
- Use absolute path: `--from-abi /Users/sirgawain/Developer/crtv3/metoken-abi.json`
- Or use relative path from current directory

### Invalid ABI Format

**Error**: `Invalid ABI format`

**Solution**:
- Ensure the JSON is valid
- Verify the ABI includes event definitions
- Check that event names match: `Subscribe`, `Mint`, `Burn`, `Register`

### Subgraph Generation Issues

**Error**: `Failed to generate subgraph`

**Solution**:
- The `--from-abi` option generates a basic subgraph
- You may need to manually customize it after generation
- Consider using the dashboard method for more control

### "Unknown config version undefined" Error

**Error**: `Deployment failed: Unknown config version undefined`

**Solution**:
- This error occurs when `--from-abi` can't find or parse the subgraph configuration
- **Use the dashboard method instead** - it's more reliable for ABI-based deployments
- The dashboard allows you to specify contract address, start block, and ABI directly
- The dashboard will generate the subgraph configuration automatically

## Summary

1. ✅ Extract ABI from `lib/contracts/MeToken.ts` (or use events only)
2. ✅ Save as `metoken-abi.json`
3. ✅ Deploy using: `goldsky subgraph deploy metokens/v0.0.2 --from-abi metoken-abi.json --start-block 16584535`
4. ✅ Or use dashboard with contract address, start block, and ABI
5. ✅ Verify subgraph is indexing
6. ✅ Deploy Mirror pipeline (already configured for v0.0.2)

---

**Last Updated**: 2025-01-20  
**Contract**: `0xba5502db2aC2cBff189965e991C07109B14eB3f5`  
**Start Block**: `16584535`  
**Network**: Base Mainnet  
**New Version**: `v0.0.2`
