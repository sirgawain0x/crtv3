# Filecoin First Integration Guide

## Overview

Filecoin First is now integrated into the IPFS storage service, providing a third layer of long-term archival storage. The complete storage strategy is:

1. **Lighthouse (Primary)** - Better CDN distribution, especially for West Coast users
2. **Storacha (Backup)** - Redundancy and persistence
3. **Filecoin First (Archival)** - Long-term storage with Filecoin miners (optional)

## What is Filecoin First?

Filecoin First allows you to create Filecoin deals directly from CIDs without uploading files to Lighthouse IPFS first. This means:
- ✅ No IPFS upload costs for Filecoin archival
- ✅ Direct storage with Filecoin miners
- ✅ Long-term archival (Filecoin deals last much longer)
- ✅ Files retrievable via Lassie or public gateways

## Setup

### Step 1: Create Filecoin First API Key

You need to create an API key using your wallet signature:

```bash
# 1. Get authentication message
curl 'https://filecoin-first.lighthouse.storage/api/v1/user/get_auth_message?publicKey=${YOUR_PUBLIC_KEY}'

# 2. Sign the message with your wallet and call
curl 'https://filecoin-first.lighthouse.storage/api/v1/user/create_api_key?publicKey=${YOUR_PUBLIC_KEY}&signature=${SIGNED_MESSAGE}'
```

**Note**: The `publicKey` should be your Ethereum address (0x...).

### Step 2: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Filecoin First API Key (optional - for long-term archival)
NEXT_PUBLIC_FILECOIN_FIRST_API_KEY=your_filecoin_first_api_key_here

# Enable Filecoin archival (optional - defaults to false)
NEXT_PUBLIC_ENABLE_FILECOIN_ARCHIVAL=true

# Existing storage keys (required for other layers)
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key
STORACHA_KEY=your_storacha_key
STORACHA_PROOF=your_storacha_proof
```

### Step 3: Use the Service

The IPFS service automatically handles Filecoin archival when enabled:

```typescript
import { ipfsService } from '@/lib/sdk/ipfs/service';

// Upload file - Filecoin deal will be created automatically in the background
const result = await ipfsService.uploadFile(file, {
  pin: true,
  wrapWithDirectory: false
});

if (result.success) {
  console.log('CID:', result.hash);
  console.log('URL:', result.url);
  // Filecoin deal ID may be undefined if archival is async (it's non-blocking)
  console.log('Filecoin Deal ID:', result.filecoinDealId);
}
```

## How It Works

### Upload Flow

1. **Primary Upload**: File is uploaded to Lighthouse (fast, better CDN)
2. **Backup Upload**: File is also uploaded to Storacha in background (redundancy)
3. **Archival Upload**: Filecoin deal is created in background using the CID (long-term)

All three steps happen automatically when you call `uploadFile`. The Filecoin archival is non-blocking and doesn't slow down the response.

### Manual CID Archival

If you already have a CID and want to create a Filecoin deal for it:

```typescript
import { FilecoinFirstService } from '@/lib/sdk/ipfs/filecoin-first-service';

const filecoinService = new FilecoinFirstService({
  apiKey: process.env.NEXT_PUBLIC_FILECOIN_FIRST_API_KEY!,
});

// Create Filecoin deal from existing CID
const result = await filecoinService.pinCid('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');

if (result.success) {
  console.log('Filecoin deal created:', result.dealId);
}
```

### Check Deal Status

Filecoin deals can take up to 2 days to be created. Check status:

```typescript
const statusResult = await filecoinService.getDealStatus(cid);

if (statusResult.success && statusResult.deals) {
  statusResult.deals.forEach(deal => {
    console.log('Deal ID:', deal.dealId);
    console.log('Status:', deal.status);
    console.log('Miner ID:', deal.minerId);
  });
}
```

### File Retrieval

Files stored on Filecoin can be retrieved using:

1. **Public IPFS Gateways**:
   - `https://ipfs.io/ipfs/{cid}`
   - `https://dweb.link/ipfs/{cid}`
   - `https://gateway.lighthouse.storage/ipfs/{cid}`

2. **Lassie** (Filecoin-specific retrieval):
   - `https://lassie.filecoin.io/{cid}`

The `FilecoinFirstService.getRetrievalUrls()` method provides these URLs:

```typescript
const urls = filecoinService.getRetrievalUrls(cid);
console.log('Retrieval URLs:', urls);
```

## Benefits

### 1. Cost Savings
- **No IPFS upload costs** for Filecoin archival
- Only need to provide the CID (which you already have)
- One-time archival cost vs. recurring IPFS storage

### 2. Long-Term Storage
- Filecoin deals provide long-term storage guarantees
- Better for archival needs
- Files remain accessible even if IPFS nodes go offline

### 3. Decentralized Storage
- True decentralized storage on Filecoin network
- Multiple miners store your data
- Resilient to single points of failure

### 4. Automatic Integration
- Works seamlessly with existing upload flow
- Non-blocking (doesn't slow down uploads)
- Optional (can be disabled)

## Configuration Options

### Enable/Disable Filecoin Archival

Set `NEXT_PUBLIC_ENABLE_FILECOIN_ARCHIVAL=true` to enable automatic archival, or `false` to disable.

You can also configure it per-instance:

```typescript
const ipfsService = new IPFSService({
  lighthouseApiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY,
  filecoinFirstApiKey: process.env.NEXT_PUBLIC_FILECOIN_FIRST_API_KEY,
  enableFilecoinArchival: true, // Enable for this instance
  // ... other config
});
```

## API Reference

### FilecoinFirstService

#### `pinCid(cid: string): Promise<FilecoinDealResult>`
Creates a Filecoin deal by pinning a CID.

**Parameters**:
- `cid` - The IPFS CID to create a deal for

**Returns**:
```typescript
{
  success: boolean;
  dealId?: string;
  error?: string;
}
```

#### `getDealStatus(cid: string): Promise<{ success: boolean; deals?: FilecoinDealStatus[]; error?: string }>`
Checks the status of Filecoin deals for a CID.

**Parameters**:
- `cid` - The IPFS CID to check deals for

**Returns**:
```typescript
{
  success: boolean;
  deals?: FilecoinDealStatus[];
  error?: string;
}
```

#### `getRetrievalUrls(cid: string): string[]`
Gets retrieval URLs for a CID.

**Parameters**:
- `cid` - The IPFS CID

**Returns**: Array of retrieval URLs

## Troubleshooting

### Deal Creation Fails

- Check that your API key is valid
- Verify the CID exists on IPFS
- Check network connectivity
- Review server logs for detailed error messages

### Deal Status Not Available

- Deals can take up to 2 days to be created
- Check back later or use a polling mechanism
- Verify the CID was successfully pinned

### Files Not Retrievable

- Ensure the CID exists on IPFS
- Try multiple retrieval gateways
- Check if the Filecoin deal has been sealed (can take time)
- Use Lassie for direct Filecoin retrieval

## Next Steps

1. **Create API Key**: Follow Step 1 to create your Filecoin First API key
2. **Add Environment Variables**: Add the API key and enable archival
3. **Test Upload**: Upload a file and verify Filecoin deal is created
4. **Check Deal Status**: Monitor deal creation (can take up to 2 days)
5. **Verify Retrieval**: Test file retrieval from Filecoin miners

## Cost Considerations

- **Filecoin First**: Free API, but you pay Filecoin miners for storage deals
- **Lighthouse**: $20 one-time for 5GB lifetime storage
- **Storacha**: Free tier available

The hybrid approach allows you to:
- Use Lighthouse for fast access (better CDN)
- Use Storacha for redundancy (free tier)
- Use Filecoin First for long-term archival (pay miners only)

This gives you the best of all worlds!
