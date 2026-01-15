# Reality.eth Subgraph Hosting Guide

## Overview

This guide explains where and how to host the Reality.eth subgraph for the Creative TV predictions feature.

## Recommended: Goldsky (Separate Project)

**Why Goldsky?**
- ✅ You're already using Goldsky for MeTokens and Creative TV subgraphs
- ✅ **Separate project** keeps Reality.eth subgraph isolated from MeTokens
- ✅ Consistent infrastructure and tooling
- ✅ Public endpoints available (no auth required for basic use)
- ✅ Familiar deployment process

### Step 1: Create a New Goldsky Project

1. **Go to Goldsky Dashboard:**
   - Visit https://app.goldsky.com/dashboard
   - Login to your account

2. **Create New Project:**
   - Click "New Project" or "Create Project"
   - Name it something like "Creative TV - Reality.eth" or "Reality.eth Predictions"
   - Select your organization/workspace
   - Click "Create"

3. **Get Your Project ID:**
   - After creation, you'll see a project ID like `project_xxxxxxxxxxxxx`
   - Copy this project ID - you'll need it for deployment

4. **Set Environment Variable:**
   ```bash
   # Add to your .env.local file
   GOLDSKY_REALITY_ETH_PROJECT_ID=project_xxxxxxxxxxxxx
   ```

### Step 2: Deploy the Subgraph

1. **Clone the Reality.eth subgraph repository:**
```bash
git clone https://github.com/RealityETH/reality-eth-monorepo.git
cd reality-eth-monorepo/packages/graph
```

2. **Install Goldsky CLI (if not already installed):**
```bash
npm install -g @goldskycom/cli
```

3. **Login to Goldsky:**
```bash
goldsky login
```

4. **Deploy the subgraph to your new project:**
```bash
# Replace PROJECT_ID with your new project ID from Step 1
goldsky subgraph deploy reality-eth \
  --project-id project_xxxxxxxxxxxxx \
  --network base \
  --version 1.0.0
```

5. **Verify deployment:**
```bash
# Check subgraph status
goldsky subgraph get reality-eth/1.0.0 --project-id project_xxxxxxxxxxxxx

# Test the endpoint (replace PROJECT_ID)
curl -X POST https://api.goldsky.com/api/public/project_xxxxxxxxxxxxx/subgraphs/reality-eth/1.0.0/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ questions(first: 1) { id question } }"}'
```

### Endpoint Configuration

After deployment, your Reality.eth subgraph will be available at:
```
https://api.goldsky.com/api/public/PROJECT_ID/subgraphs/reality-eth/1.0.0/gn
```

Replace `PROJECT_ID` with your new project ID from Step 1.

This endpoint is already configured in:
- `lib/sdk/reality-eth/reality-eth-subgraph.ts`
- `app/api/reality-eth-subgraph/route.ts`

### Using the Subgraph in Code

The subgraph can be accessed via the API proxy route:

```typescript
import { GET_QUESTIONS } from '@/lib/sdk/reality-eth/reality-eth-subgraph';

// Query through the API proxy
const response = await fetch('/api/reality-eth-subgraph', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: GET_QUESTIONS,
    variables: { first: 10, skip: 0 }
  })
});
```

## Alternative Options

### Option 2: The Graph Network (Decentralized)

**Pros:**
- Fully decentralized network
- High availability
- No single point of failure
- Community-curated

**Cons:**
- Different infrastructure from your current setup
- Requires GRT tokens for curation
- More complex setup

**Deployment:**
1. Use [The Graph Studio](https://thegraph.com/studio/)
2. Publish subgraph to the decentralized network
3. Wait for indexers to pick it up
4. Query via The Graph Network endpoints

**Documentation:** https://thegraph.com/docs/en/developer/quick-start/

### Option 3: Chainstack

**Pros:**
- Dedicated subgraph hosting
- 99.9% availability SLA
- Intuitive interface
- Supports multiple networks

**Cons:**
- Additional service to manage
- Different from your current infrastructure

**Documentation:** https://chainstack.com/dedicated-subgraphs/

### Option 4: Self-Hosting

**Pros:**
- Full control
- No external dependencies
- Custom configuration

**Cons:**
- Requires infrastructure management
- Higher operational overhead
- Need to maintain indexer nodes

**Requirements:**
- Graph Node instance
- IPFS node
- PostgreSQL database
- Ethereum RPC endpoint

## Current Implementation

The codebase is already set up to use Goldsky:

1. **Subgraph Queries:** `lib/sdk/reality-eth/reality-eth-subgraph.ts`
   - GraphQL queries for questions and answers
   - Helper function for endpoint URL

2. **API Proxy:** `app/api/reality-eth-subgraph/route.ts`
   - Server-side proxy to handle CORS
   - Supports both public and private endpoints
   - Automatic fallback logic

3. **Usage in Components:**
   - `components/predictions/PredictionList.tsx` - Can be updated to use subgraph
   - `components/predictions/PredictionDetails.tsx` - Can fetch question details

## Contract Configuration

Before deploying, you'll need the contract address, start block, and ABI. See **`REALITY_ETH_SUBGRAPH_CONFIG.md`** for complete details:

- **Contract Address:** `0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8`
- **Start Block:** `26260675`
- **ABI:** Located at `node_modules/@reality.eth/contracts/abi/solc-0.8.6/RealityETH-3.0.abi.json`

## Next Steps

1. **Create a new Goldsky project** (see Step 1 above)
   - Keep it separate from your MeTokens project
   - Copy the project ID

2. **Set environment variable:**
   ```bash
   # Add to .env.local
   GOLDSKY_REALITY_ETH_PROJECT_ID=project_xxxxxxxxxxxxx
   ```

3. **Prepare the subgraph:**
   ```bash
   # Clone the Reality.eth subgraph
   git clone https://github.com/RealityETH/reality-eth-monorepo.git
   cd reality-eth-monorepo/packages/graph
   
   # Copy the ABI file
   mkdir -p abis
   cp ../../node_modules/@reality.eth/contracts/abi/solc-0.8.6/RealityETH-3.0.abi.json ./abis/
   
   # Update subgraph.yaml with:
   # - address: 0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8
   # - startBlock: 26260675
   # - network: base
   ```

4. **Deploy the subgraph:**
   ```bash
   goldsky subgraph deploy reality-eth \
     --project-id project_xxxxxxxxxxxxx \
     --network base \
     --version 1.0.0
   ```

4. **Update PredictionList component** to fetch from subgraph instead of contract

5. **Test the integration** using the API proxy route

6. **Monitor subgraph health** in Goldsky dashboard

## Troubleshooting

### Subgraph Not Found (404)
- Verify the subgraph is deployed: `goldsky subgraph list`
- Check the version matches: `1.0.0`
- Ensure network is correct: `base`

### Rate Limiting (429)
- Implement request caching
- Use private endpoint with API key for higher limits
- Contact Goldsky support for rate limit increases

### No Data Returned
- Check subgraph sync status in Goldsky dashboard
- Verify the contract address is correct
- Check subgraph logs for indexing errors

## Support Resources

- **Goldsky Documentation:** https://docs.goldsky.com/
- **Reality.eth Subgraph:** https://github.com/RealityETH/reality-eth-monorepo/tree/main/packages/graph
- **The Graph Documentation:** https://thegraph.com/docs/

---

**Last Updated:** 2025-01-XX  
**Recommended Host:** Goldsky  
**Project ID:** Set via `GOLDSKY_REALITY_ETH_PROJECT_ID` environment variable  
**Note:** Uses a separate project from MeTokens subgraphs for isolation
