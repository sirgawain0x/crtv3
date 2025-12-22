# Story Protocol Integration Guide

This document describes the Story Protocol integration for registering video IP assets and managing licensing on-chain.

## Overview

The Story Protocol integration allows users to register their music videos as IP Assets on the Story Protocol blockchain, enabling on-chain IP management, licensing, and royalty distribution.

## Features

- **IP Asset Registration**: Register NFTs as IP Assets on Story Protocol
- **License Terms Management**: Attach Programmable IP License (PIL) terms to IP Assets
- **License Templates**: Pre-defined license templates (Commercial Remix, Non-Commercial Share Alike, etc.)
- **Upload Flow Integration**: Seamless integration into the video upload process

## Architecture

### Components

1. **SDK Client** (`lib/sdk/story/client.ts`)
   - Creates and configures Story Protocol SDK client
   - Handles network configuration (testnet/mainnet)
   - Manages viem version compatibility

2. **IP Registration Service** (`lib/sdk/story/ip-registration.ts`)
   - Registers NFTs as IP Assets
   - Attaches license terms to IP Assets
   - Verifies IP Asset registration status

3. **Server Service** (`services/story-protocol.ts`)
   - Orchestrates the full IP registration flow
   - Updates database with registration data
   - Handles error cases gracefully

4. **UI Components**
   - `StoryLicenseSelector`: UI for selecting license terms during upload
   - Integrated into `CreateThumbnailForm` component

### Database Schema

The following fields were added to the `video_assets` table:

- `story_ip_registered` (boolean): Whether the video is registered on Story Protocol
- `story_ip_id` (text): Story Protocol IP Asset ID
- `story_ip_registration_tx` (text): Transaction hash of registration
- `story_ip_registered_at` (timestamp): Registration timestamp
- `story_license_terms_id` (text): License terms ID (if attached)
- `story_license_template_id` (text): License template ID used

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Story Protocol Configuration
NEXT_PUBLIC_STORY_NETWORK=testnet  # or "mainnet" for production
NEXT_PUBLIC_STORY_RPC_URL=https://rpc.aeneid.story.foundation  # Testnet RPC
```

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed setup instructions.

### Database Migration

Apply the migration to add Story Protocol fields:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard
```

Migration file: `supabase/migrations/20250117_add_story_protocol_fields_to_video_assets.sql`

## Usage

### During Video Upload

1. User uploads a video through the standard upload flow
2. On the thumbnail/configuration step, user can enable Story Protocol IP registration
3. User selects a license template (Commercial Remix, Non-Commercial, etc.)
4. After video is published, if IP registration is enabled:
   - System checks if video has an NFT minted
   - Registers the NFT as an IP Asset on Story Protocol
   - Attaches selected license terms (if provided)
   - Updates database with registration data

### Programmatic Usage

```typescript
import { registerVideoAsIPAsset } from "@/services/story-protocol";
import type { StoryIPRegistrationOptions } from "@/lib/types/story-protocol";

const result = await registerVideoAsIPAsset(
  videoAsset,
  creatorAddress,
  {
    registerIP: true,
    licenseTerms: {
      templateId: "commercial-remix",
      commercialUse: true,
      derivativesAllowed: true,
      derivativesAttribution: true,
      // ... other terms
    },
    metadataURI: "ipfs://...", // Optional
  }
);

if (result.success) {
  console.log("IP Asset ID:", result.ipId);
  console.log("Transaction:", result.registrationTx);
}
```

## License Templates

Pre-defined PIL templates available:

1. **Commercial Remix**: Allows commercial use and derivatives with attribution
2. **Non-Commercial Share Alike**: Non-commercial use only, derivatives must use same license
3. **Commercial No Derivatives**: Commercial use allowed, but no derivatives
4. **All Rights Reserved**: No commercial use, no derivatives

See `lib/types/story-protocol.ts` for full template definitions.

## Prerequisites

### NFT Minting

**Important**: Videos must have an NFT minted before IP registration. The system currently requires:

- `video_assets.contract_address`: NFT contract address
- `video_assets.token_id`: NFT token ID

If a video doesn't have an NFT, IP registration will fail with an error message.

**Future Enhancement**: Implement NFT minting as part of the Story Protocol flow using Story's SPG NFT Client or existing NFT infrastructure.

## Network Support

### Testnet (Aeneid)

- **Chain ID**: 1315
- **RPC URL**: `https://rpc.aeneid.story.foundation`
- **Network**: `"testnet"` or `"aeneid"`

### Mainnet

- **Chain ID**: 1514
- **RPC URL**: `https://rpc.story.foundation` (when available)
- **Network**: `"mainnet"`

## Error Handling

The integration includes comprehensive error handling:

- **NFT Not Minted**: Returns clear error if video doesn't have NFT
- **Registration Failure**: Logs error and returns failure status
- **License Attachment Failure**: Non-fatal - IP is registered but license attachment fails
- **Database Update Failure**: Logs warning but registration still succeeds on-chain

All errors are logged to console and returned in the result object for UI display.

## Limitations & Future Work

### Current Limitations

1. **License Terms Registration**: Currently only supports attaching existing license terms by ID. Full PIL terms registration with all required fields (defaultMintingFee, expiration, etc.) needs to be implemented.

2. **NFT Minting**: NFT minting is not implemented. Videos must be minted as NFTs before IP registration.

3. **Wallet Signing**: The registration flow currently uses server actions (`"use server"`), but Story Protocol transactions require wallet signing. The SDK client is created with just an account address. **Important**: This implementation assumes the Story Protocol SDK can handle signing through Account Kit's infrastructure or that transactions can be prepared on the server and signed client-side. If this doesn't work in practice, the registration flow may need to be refactored to execute client-side using the user's connected wallet.

### Future Enhancements

- [ ] Implement full PIL terms registration with proper configuration UI
- [ ] Integrate NFT minting into the upload flow
- [ ] Add IP Asset status viewing in video details
- [ ] Support for attaching multiple license terms
- [ ] License token minting and distribution
- [ ] Derivative IP registration
- [ ] Royalty distribution setup

## Troubleshooting

### "Video must have an NFT minted before IP registration"

**Solution**: Ensure the video has been minted as an NFT with valid `contract_address` and `token_id` before attempting IP registration.

### "License terms ID is required"

**Solution**: This error occurs when trying to attach license terms without providing a `termsId`. Currently, only attaching existing terms is supported. Register license terms separately or use the template-based approach.

### "Story Protocol client initialization failed"

**Solution**: 
- Verify `NEXT_PUBLIC_STORY_RPC_URL` is set correctly
- Check network connectivity to Story Protocol RPC
- Ensure `NEXT_PUBLIC_STORY_NETWORK` is set to "testnet" or "mainnet"

### Registration succeeds but database doesn't update

**Solution**: Check server logs for database update errors. The IP Asset is still registered on-chain, but database sync may have failed. You can manually update the database or re-run the registration (it should detect existing registration).

## Resources

- [Story Protocol Documentation](https://docs.story.foundation/)
- [Story Protocol SDK](https://github.com/storyprotocol/core-sdk)
- [Aeneid Testnet Guide](https://docs.story.foundation/developer-guides/testnet-setup)
- [PIL Terms Documentation](https://docs.story.foundation/concepts/programmable-ip-license/pil-terms)

## Support

For issues or questions:
1. Check this documentation
2. Review Story Protocol documentation
3. Check server logs for detailed error messages
4. Verify environment variables are set correctly

