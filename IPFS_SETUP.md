# IPFS Avatar Upload Setup

This project now uses Lighthouse for IPFS storage instead of Supabase storage buckets for avatar uploads.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Lighthouse IPFS API Key
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here

# Optional: Custom IPFS Gateway (defaults to Lighthouse gateway)
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.lighthouse.storage/ipfs
```

## Getting a Lighthouse API Key

1. Go to [Lighthouse Storage](https://lighthouse.storage/)
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the API key and add it to your environment variables

## How It Works

- Avatar uploads are now stored on IPFS via Lighthouse
- The IPFS hash/URL is stored in the database `avatar_url` field
- Images are permanently stored and accessible via IPFS gateways
- No need for Supabase storage buckets

## File Size Limits

- **Avatar images**: Maximum 2MB per file
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Storage efficiency**: With 5GB total storage, this allows for 2,500+ user avatars
- **Quality**: 2MB provides high-quality images (400x400 to 800x800 pixels) suitable for all display sizes

## Benefits

- **Decentralized**: Images are stored on IPFS, not centralized servers
- **Permanent**: Once uploaded, images are permanently available
- **Cost-effective**: One-time payment for permanent storage
- **No bucket management**: No need to create or manage storage buckets
- **Storage optimized**: 2MB limit balances quality with storage efficiency

## Migration Notes

- Existing Supabase storage avatars will continue to work
- New uploads will use IPFS
- The `avatar_url` field in the database now stores full IPFS URLs instead of Supabase storage paths
