# Storacha (web3.storage) Migration Guide

## Overview
Storacha (formerly web3.storage) is a recommended alternative to Lighthouse for IPFS storage. It provides decentralized storage with better reliability and is specifically designed for web3 applications.

## Why Storacha?
- **True IPFS Gateway**: Uses actual IPFS gateways (w3s.link) instead of CDN-backed alternatives
- **Better Performance**: Fast and reliable IPFS access
- **Decentralized**: Built on IPFS and Filecoin for permanent storage
- **Free Tier**: Generous free tier for getting started
- **Better SDK**: Modern JavaScript SDK with TypeScript support

## Current Setup
The application currently uses:
- **Uploads**: Lighthouse for uploading to IPFS
- **Display**: Now uses `w3s.link` (Storacha) gateway for displaying IPFS content

## Gateway Configuration
IPFS gateways are now prioritized in this order:
1. `w3s.link` (Storacha) - Primary, fast and reliable
2. `gateway.pinata.cloud` (Pinata) - Reliable fallback
3. `dweb.link` (Protocol Labs) - Standard IPFS gateway
4. `4everland.io` (4everland) - Decentralized option
5. `ipfs.io` - Public gateway fallback
6. `gateway.lighthouse.storage` - Keep for existing content

## Migrating Uploads to Storacha

### 1. Install Storacha SDK
```bash
npm install @web3-storage/w3up-client
```

### 2. Get Storacha API Key
1. Go to [console.web3.storage](https://console.web3.storage)
2. Sign up or log in
3. Create a new space
4. Generate an API token
5. Add to your `.env.local`:

```bash
# Storacha API Token
NEXT_PUBLIC_STORACHA_TOKEN=your_storacha_token_here

# Optional: Custom IPFS Gateway (defaults to w3s.link)
NEXT_PUBLIC_IPFS_GATEWAY=https://w3s.link/ipfs
```

### 3. Update IPFS Service

Create a new file `lib/sdk/ipfs/storacha-service.ts`:

```typescript
import { create } from '@web3-storage/w3up-client';

export interface StorachaUploadResult {
  success: boolean;
  url?: string;
  cid?: string;
  error?: string;
}

export class StorachaService {
  private client: any;
  private gateway: string;

  constructor(config: { token: string; gateway?: string }) {
    this.gateway = config.gateway || 'https://w3s.link/ipfs';
    this.initClient(config.token);
  }

  private async initClient(token: string) {
    this.client = await create();
    // Parse and set authorization from token
    const parsed = await this.client.login(token);
    await this.client.setCurrentSpace(parsed.spaces[0].did());
  }

  async uploadFile(file: File): Promise<StorachaUploadResult> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'Storacha client not initialized',
        };
      }

      // Upload file to Storacha
      const cid = await this.client.uploadFile(file);
      const url = `${this.gateway}/${cid}`;

      return {
        success: true,
        url,
        cid: cid.toString(),
      };
    } catch (error) {
      console.error('Storacha upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  getPublicUrl(cid: string): string {
    return `${this.gateway}/${cid}`;
  }
}

// Default Storacha service instance
export const storachaService = new StorachaService({
  token: process.env.NEXT_PUBLIC_STORACHA_TOKEN || '',
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://w3s.link/ipfs',
});
```

### 4. Update Upload Components

Replace Lighthouse uploads with Storacha in your upload components:

```typescript
// Before (Lighthouse)
import { ipfsService } from '@/lib/sdk/ipfs/service';

// After (Storacha)
import { storachaService } from '@/lib/sdk/ipfs/storacha-service';

// Usage
const result = await storachaService.uploadFile(file);
if (result.success) {
  console.log('Uploaded to IPFS:', result.url);
}
```

## Benefits of Migration

### Performance
- **Faster Uploads**: Storacha has optimized upload speeds
- **Better Gateway**: w3s.link is faster and more reliable than many alternatives
- **CDN Integration**: Built-in CDN for faster global access

### Reliability
- **High Availability**: 99.9% uptime SLA
- **Redundancy**: Content stored across multiple IPFS nodes
- **Filecoin Backup**: Automatic backup to Filecoin network

### Developer Experience
- **Modern SDK**: TypeScript support, better error handling
- **Better Documentation**: Comprehensive guides and examples
- **Active Maintenance**: Regular updates and community support

## Cost Comparison

### Lighthouse
- 5GB free
- Pay-as-you-go after

### Storacha (web3.storage)
- 5GB free tier
- Storage Plans: Pay for additional storage
- More predictable pricing

## Migration Strategy

### Phase 1: Gateway Switch (✅ Complete)
- All display URLs now use w3s.link gateway
- Existing content still accessible via multiple gateways
- No changes to uploaded content

### Phase 2: New Uploads (Recommended)
- Switch new uploads to Storacha
- Keep Lighthouse API key for backward compatibility
- Dual support during transition

### Phase 3: Full Migration (Optional)
- Migrate existing content to Storacha
- Retire Lighthouse dependency
- Single storage provider

## Testing

Test gateway access for existing content:
```bash
# Test w3s.link gateway
curl -I https://w3s.link/ipfs/YOUR_CID

# Test with fallback gateways
curl -I https://gateway.pinata.cloud/ipfs/YOUR_CID
curl -I https://dweb.link/ipfs/YOUR_CID
```

## Current Status

✅ **Gateway Migration Complete**
- All IPFS URLs now use w3s.link as primary gateway
- Automatic fallback to alternative gateways
- Better performance and reliability

🔄 **Upload Migration**
- Still using Lighthouse for uploads
- Can migrate to Storacha when ready
- No impact on existing functionality

## Resources

- [Storacha Documentation](https://web3.storage/docs/)
- [Storacha Console](https://console.web3.storage)
- [w3up SDK](https://github.com/web3-storage/w3up)
- [Migration Guide](https://web3.storage/docs/how-to/migrate/)

